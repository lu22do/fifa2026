export type MatchStage = 'group' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final'
export type MatchStatus = 'scheduled' | 'live' | 'half_time' | 'finished' | 'postponed' | 'abandoned'
export type BetCategory = 'match_result' | 'btts' | 'total_goals' | 'correct_score' | 'first_goalscorer'

export interface Team {
  id: string
  name: string
  code: string
}

export interface Match {
  id: string
  home_team_id: string
  away_team_id: string
  stage: MatchStage
  kickoff_at: string
  venue: string | null
  status: MatchStatus
  score_home: number | null
  score_away: number | null
  first_goalscorer: string | null
  bet_lock_at: string | null
}

export interface BetHistoryEntry {
  id: string
  bet_id: string
  event_type: 'placed' | 'modified' | 'locked' | 'settled' | 'voided'
  old_selection: string | null
  new_selection: string | null
  changed_at: string
}

export interface Bet {
  id: string
  user_id: string
  match_id: string
  betting_category: BetCategory
  selection: string
  points_locked: number
  points_awarded: number | null
  status: 'active' | 'locked' | 'correct' | 'incorrect' | 'void'
  change_count: number
  placed_at: string
  locked_at: string | null
  settled_at: string | null
  bet_history?: BetHistoryEntry[]
}

export interface UserProfile {
  id: string
  display_name: string
  total_points: number
  role: 'player' | 'admin'
}

export interface LeaderboardEntry {
  id: string
  display_name: string
  total_points: number
  correct_predictions: number
}
