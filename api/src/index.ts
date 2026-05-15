import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '../.env' })

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const PORT = Number(process.env.PORT || 4000)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const app = express()
app.use(cors())
app.use(express.json())

const stageMultiplier = {
  group: 1,
  round_of_16: 2,
  quarter_final: 3,
  semi_final: 4,
  third_place: 5,
  final: 6,
}

function getToken(req: express.Request) {
  const auth = req.headers.authorization
  if (!auth) return null
  return auth.replace(/^Bearer\s+/i, '')
}

async function authorize(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getToken(req)
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = data.user
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile) {
    const display_name = (user.user_metadata as any)?.full_name || user.email || 'Player'
    const insert = await supabase.from('users').insert({ id: user.id, display_name }).single()
    if (insert.error) {
      return res.status(500).json({ error: insert.error.message })
    }
    ;(req as any).profile = insert.data
  } else {
    ;(req as any).profile = profile
  }

  ;(req as any).user = user
  next()
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const profile = (req as any).profile
  if (profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

function computePoints(points: number, stage: string) {
  return points * (stageMultiplier[stage as keyof typeof stageMultiplier] ?? 1)
}

app.get('/api/me', authorize, async (req, res) => {
  const profile = (req as any).profile
  return res.json({ profile })
})

app.put('/api/users/profile', authorize, async (req, res) => {
  const profile = (req as any).profile
  const { display_name } = req.body
  if (!display_name) {
    return res.status(400).json({ error: 'display_name is required' })
  }
  const { data, error } = await supabase.from('users').update({ display_name }).eq('id', profile.id).single()
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ profile: data })
})

app.get('/api/matches', authorize, async (req, res) => {
  const [{ data: matches, error: matchesError }, { data: teams, error: teamsError }, { data: categoryPoints, error: categoryError }] = await Promise.all([
    supabase.from('matches').select('*').order('kickoff_at', { ascending: true }),
    supabase.from('teams').select('*'),
    supabase.from('betting_category_points').select('*').eq('is_active', true),
  ])

  if (matchesError || teamsError || categoryError) {
    return res.status(500).json({ error: (matchesError || teamsError || categoryError)?.message })
  }

  const enriched = matches?.map((match) => ({
    ...match,
    bet_lock_at: match.bet_lock_at || new Date(new Date(match.kickoff_at).getTime() - 60 * 60000).toISOString(),
  }))

  return res.json({ matches: enriched, teams, categoryPoints })
})

app.get('/api/bets', authorize, async (req, res) => {
  const profile = (req as any).profile
  const { data, error } = await supabase
    .from('bets')
    .select('*, bet_history(*)')
    .eq('user_id', profile.id)
    .order('placed_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ bets: data })
})

app.post('/api/bets', authorize, async (req, res) => {
  const profile = (req as any).profile
  const { matchId, bettingCategory, selection } = req.body
  if (!matchId || !bettingCategory || !selection) {
    return res.status(400).json({ error: 'matchId, bettingCategory, and selection are required' })
  }

  const { data: match, error: matchError } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (matchError || !match) {
    return res.status(404).json({ error: 'Match not found' })
  }

  const lockAt = match.bet_lock_at || new Date(new Date(match.kickoff_at).getTime() - 60 * 60000).toISOString()
  if (new Date() > new Date(lockAt)) {
    return res.status(400).json({ error: 'Bet change window has closed' })
  }

  const { data: category, error: categoryError } = await supabase
    .from('betting_category_points')
    .select('*')
    .or(`and(betting_category.eq.${bettingCategory},stage.eq.${match.stage}),and(betting_category.eq.${bettingCategory},stage.is.null)`)
    .order('stage', { ascending: false })
    .limit(1)
    .single()

  if (categoryError || !category) {
    return res.status(400).json({ error: 'Betting category configuration not found' })
  }

  const pointsLocked = computePoints(category.points, match.stage)

  const { data: existingBet, error: existingError } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', profile.id)
    .eq('match_id', matchId)
    .eq('betting_category', bettingCategory)
    .single()

  if (existingError && existingError.code !== 'PGRST116') {
    return res.status(500).json({ error: existingError.message })
  }

  if (existingBet) {
    const { data: updatedBet, error: updateError } = await supabase
      .from('bets')
      .update({ selection, change_count: existingBet.change_count + 1 })
      .eq('id', existingBet.id)
      .single()

    if (updateError) return res.status(500).json({ error: updateError.message })
    await supabase.from('bet_history').insert({ bet_id: existingBet.id, event_type: 'modified', old_selection: existingBet.selection, new_selection: selection })
    return res.json({ bet: updatedBet })
  }

  const { data: bet, error: betError } = await supabase.from('bets').insert({
    user_id: profile.id,
    match_id: matchId,
    betting_category: bettingCategory,
    selection,
    points_locked: pointsLocked,
    status: 'active',
    change_count: 0,
  }).single() as { data: any; error: any }

  if (betError) return res.status(500).json({ error: betError.message })
  await supabase.from('bet_history').insert({ bet_id: bet.id, event_type: 'placed', new_selection: selection })
  return res.json({ bet })
})

app.get('/api/leaderboard', authorize, async (req, res) => {
  const { data, error } = await supabase.from('leaderboard').select('*').order('total_points', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ leaderboard: data })
})

app.post('/api/matches', authorize, requireAdmin, async (req, res) => {
  const { home_team_id, away_team_id, stage, kickoff_at, venue } = req.body
  if (!home_team_id || !away_team_id || !stage || !kickoff_at) {
    return res.status(400).json({ error: 'Missing required match data' })
  }
  const bet_lock_at = new Date(new Date(kickoff_at).getTime() - 60 * 60000).toISOString()
  const { data, error } = await supabase.from('matches').insert({ home_team_id, away_team_id, stage, kickoff_at, venue, bet_lock_at }).single()
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ match: data })
})

app.patch('/api/matches/:matchId', authorize, requireAdmin, async (req, res) => {
  const { matchId } = req.params
  const updates = req.body
  if (updates.kickoff_at) {
    updates.bet_lock_at = new Date(new Date(updates.kickoff_at).getTime() - 60 * 60000).toISOString()
  }
  const { data, error } = await supabase.from('matches').update(updates).eq('id', matchId).single()
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ match: data })
})

function settleBet(match: any, bet: any) {
  const scoreHome = Number(match.score_home ?? 0)
  const scoreAway = Number(match.score_away ?? 0)
  const totalGoals = scoreHome + scoreAway
  const isDraw = scoreHome === scoreAway

  switch (bet.betting_category) {
    case 'match_result': {
      const winner = isDraw ? 'draw' : scoreHome > scoreAway ? 'home' : 'away'
      return winner === bet.selection ? 'correct' : 'incorrect'
    }
    case 'btts': {
      const result = scoreHome > 0 && scoreAway > 0 ? 'yes' : 'no'
      return result === bet.selection ? 'correct' : 'incorrect'
    }
    case 'total_goals': {
      const result = totalGoals > 2.5 ? 'over' : 'under'
      return result === bet.selection ? 'correct' : 'incorrect'
    }
    case 'correct_score': {
      return bet.selection === `${scoreHome}-${scoreAway}` ? 'correct' : 'incorrect'
    }
    case 'first_goalscorer': {
      return match.first_goalscorer === bet.selection ? 'correct' : 'incorrect'
    }
    default:
      return 'incorrect'
  }
}

app.post('/api/matches/:matchId/settle', authorize, requireAdmin, async (req, res) => {
  const { matchId } = req.params
  const { score_home, score_away, first_goalscorer, status = 'finished' } = req.body
  if (score_home === undefined || score_away === undefined) {
    return res.status(400).json({ error: 'score_home and score_away are required' })
  }
  const { data: match, error: matchError } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (matchError || !match) {
    return res.status(404).json({ error: 'Match not found' })
  }

  const { data: bets, error: betsError } = await supabase.from('bets').select('*').eq('match_id', matchId).eq('status', 'active')
  if (betsError) return res.status(500).json({ error: betsError.message })

  const updatedMatch = await supabase.from('matches').update({ score_home, score_away, first_goalscorer, status }).eq('id', matchId).single()
  if (updatedMatch.error) return res.status(500).json({ error: updatedMatch.error.message })

  for (const bet of bets ?? []) {
    const result = settleBet({ ...match, score_home, score_away, first_goalscorer }, bet)
    const points_awarded = result === 'correct' ? bet.points_locked : 0
    await supabase.from('bets').update({ status: result, points_awarded, settled_at: new Date().toISOString() }).eq('id', bet.id)
    await supabase.from('bet_history').insert({ bet_id: bet.id, event_type: 'settled', old_selection: bet.selection, new_selection: bet.selection })
    if (result === 'correct') {
      const { data: userData, error: userError } = await supabase.from('users').select('total_points').eq('id', bet.user_id).single()
      if (!userError && userData) {
        const newTotal = Number(userData.total_points ?? 0) + points_awarded
        await supabase.from('users').update({ total_points: newTotal }).eq('id', bet.user_id)
      }
    }
  }

  return res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
