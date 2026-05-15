import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useNotificationStore } from '../state/useNotificationStore'
import { categoryText, matchOutcomeOptions, bttsOptions, totalGoalsOptions, scoreOptions, stageMultiplier } from '../lib/points'
import { useAuthStore } from '../state/useAuthStore'

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function MatchesPage() {
  const queryClient = useQueryClient()
  const addNotification = useNotificationStore((state) => state.addNotification)
  const profile = useAuthStore((state) => state.profile)

  const matchesQuery = useQuery<import('../lib/api').MatchesResponse, Error>({
    queryKey: ['matches'],
    queryFn: api.getMatches,
  })

  const betsQuery = useQuery<{ bets: Array<Record<string, any>> }, Error>({
    queryKey: ['bets'],
    queryFn: api.getBets,
  })

  const createBetMutation = useMutation({
    mutationFn: api.placeBet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bets'] })
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      addNotification('Prediction confirmed.', 'success')
    },
    onError: (error) => addNotification((error as Error).message, 'error'),
  })

  const [selectionState, setSelectionState] = useState<Record<string, string>>({})
  const [categoryState, setCategoryState] = useState<Record<string, string>>({})

  const teamsById = useMemo(() => {
    const map = new Map<string, string>()
    matchesQuery.data?.teams?.forEach((team) => map.set(team.id, `${team.name}`))
    return map
  }, [matchesQuery.data?.teams])

  const betsByMatchCategory = useMemo(() => {
    const map = new Map<string, any>()
    betsQuery.data?.bets?.forEach((bet) => {
      map.set(`${bet.match_id}:${bet.betting_category}`, bet)
    })
    return map
  }, [betsQuery.data?.bets])

  const matchCards = matchesQuery.data?.matches ?? []

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Matches</h1>
            <p className="mt-2 text-slate-400">Place or modify predictions up until the lock window closes.</p>
          </div>
          <div className="rounded-3xl bg-slate-900 px-5 py-4 text-white">
            <p className="text-sm text-slate-400">Logged in as</p>
            <p className="mt-1 text-lg font-medium text-sky-300">{profile?.display_name ?? 'Player'}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        {matchCards.length === 0 && <p className="text-slate-400">No matches configured yet.</p>}
        {matchCards.map((match) => {
          const home = teamsById.get(match.home_team_id) ?? 'Home'
          const away = teamsById.get(match.away_team_id) ?? 'Away'
          const keyBase = `${match.id}`
          const currentBet = betsByMatchCategory.get(`${match.id}:${categoryState[keyBase] ?? 'match_result'}`)
          const points = match?.category_points ?? 0
          const locked = new Date() > new Date(match.bet_lock_at ?? match.kickoff_at)

          return (
            <article key={match.id} className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-lg shadow-black/20">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-sky-400">{match.stage.replaceAll('_', ' ')}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{home} vs {away}</h2>
                  <p className="mt-1 text-slate-400">{formatTime(match.kickoff_at)} · {match.venue || 'Unknown stadium'}</p>
                  <p className="mt-1 text-sm text-slate-500">Status: {match.status}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/90 px-4 py-3 text-right text-sm text-slate-200">
                  <p>Lock window: {formatTime(match.bet_lock_at ?? match.kickoff_at)}</p>
                  <p className="mt-2 font-semibold text-sky-300">Stage multiplier x{stageMultiplier[match.stage as keyof typeof stageMultiplier]}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-4">
                  <label className="block text-sm font-medium text-slate-200">Betting category</label>
                  <select
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none"
                    value={categoryState[keyBase] ?? 'match_result'}
                    onChange={(event) => {
                      setCategoryState((prev) => ({ ...prev, [keyBase]: event.target.value }))
                    }}
                  >
                    {['match_result', 'btts', 'total_goals', 'correct_score', 'first_goalscorer'].map((category) => (
                      <option key={category} value={category}>
                        {categoryText[category as keyof typeof categoryText]}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-slate-400">Points on offer for this category will be set by the admin configuration.</p>
                </div>

                <div className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-4">
                  {(() => {
                    const category = categoryState[keyBase] ?? 'match_result'
                    if (category === 'match_result') {
                      return (
                        <fieldset className="space-y-2">
                          <legend className="text-sm font-medium text-slate-200">Outcome</legend>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {matchOutcomeOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setSelectionState((prev) => ({ ...prev, [keyBase]: option.value }))}
                                className={`rounded-2xl border px-3 py-2 text-left transition ${selectionState[keyBase] === option.value ? 'border-sky-400 bg-sky-500/10 text-sky-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      )
                    }
                    if (category === 'btts') {
                      return (
                        <fieldset className="space-y-2">
                          <legend className="text-sm font-medium text-slate-200">Both teams to score?</legend>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {bttsOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setSelectionState((prev) => ({ ...prev, [keyBase]: option.value }))}
                                className={`rounded-2xl border px-3 py-2 transition ${selectionState[keyBase] === option.value ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      )
                    }
                    if (category === 'total_goals') {
                      return (
                        <fieldset className="space-y-2">
                          <legend className="text-sm font-medium text-slate-200">Total goals</legend>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {totalGoalsOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setSelectionState((prev) => ({ ...prev, [keyBase]: option.value }))}
                                className={`rounded-2xl border px-3 py-2 transition ${selectionState[keyBase] === option.value ? 'border-violet-400 bg-violet-500/10 text-violet-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      )
                    }
                    if (category === 'correct_score') {
                      return (
                        <fieldset className="space-y-2">
                          <legend className="text-sm font-medium text-slate-200">Exact score</legend>
                          <div className="grid gap-2 sm:grid-cols-5">
                            {scoreOptions.map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setSelectionState((prev) => ({ ...prev, [keyBase]: score }))}
                                className={`rounded-2xl border px-3 py-2 transition ${selectionState[keyBase] === score ? 'border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      )
                    }
                    return (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">First goalscorer</label>
                        <input
                          type="text"
                          value={selectionState[keyBase] ?? ''}
                          onChange={(event) => setSelectionState((prev) => ({ ...prev, [keyBase]: event.target.value }))}
                          placeholder="Enter player name"
                          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-slate-500"
                        />
                      </div>
                    )
                  })()}
                  <button
                    type="button"
                    disabled={locked || !selectionState[keyBase]}
                    onClick={() => {
                      const category = categoryState[keyBase] ?? 'match_result'
                      const selection = selectionState[keyBase]
                      createBetMutation.mutate({ matchId: match.id, bettingCategory: category, selection })
                    }}
                    className="mt-4 inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {locked ? 'Locked' : currentBet ? 'Modify prediction' : 'Place prediction'}
                  </button>
                  {currentBet && (
                    <p className="text-sm text-slate-400">Current pick: {currentBet.selection} · {currentBet.status}</p>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
