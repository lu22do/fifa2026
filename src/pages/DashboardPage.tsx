import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useNotificationStore } from '../state/useNotificationStore'
import { useAuthStore } from '../state/useAuthStore'

function agoLabel(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function DashboardPage() {
  const profile = useAuthStore((state) => state.profile)
  const addNotification = useNotificationStore((state) => state.addNotification)

  const matchesQuery = useQuery<import('../lib/api').MatchesResponse, Error>({
    queryKey: ['matches'],
    queryFn: api.getMatches,
  })

  useEffect(() => {
    if (matchesQuery.error) {
      addNotification(matchesQuery.error.message, 'error')
    }
    if (matchesQuery.data?.matches.length === 0) {
      addNotification('No matches have been configured yet. Admins can add them in the admin panel.', 'info')
    }
  }, [matchesQuery.data, matchesQuery.error, addNotification])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sky-500">Welcome back</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{profile?.display_name ?? 'Player'}</h1>
            <p className="mt-2 text-slate-400">Track your bets, modify predictions, and climb the leaderboard.</p>
          </div>
          <div className="rounded-3xl bg-slate-900 px-5 py-4 text-white shadow-inner shadow-black/10">
            <p className="text-sm text-slate-400">Current score</p>
            <p className="mt-2 text-4xl font-semibold text-sky-300">{profile?.total_points ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/10">
          <h2 className="text-xl font-semibold text-white">Upcoming bets</h2>
          <p className="mt-2 text-slate-400">Stay ahead of the lock window. Open matches can be changed until 60 minutes before kickoff.</p>
          <div className="mt-5 space-y-4">
            {matchesQuery.isLoading && <p className="text-slate-400">Loading matches...</p>}
            {matchesQuery.data?.matches.slice(0, 3).map((match) => (
              <div key={match.id} className="rounded-3xl border border-slate-800 bg-slate-900/95 p-4">
                <p className="text-sm text-slate-400">{match.stage.replaceAll('_', ' ').toUpperCase()}</p>
                <p className="mt-1 text-lg font-semibold text-white">{match.home_team_id} vs {match.away_team_id}</p>
                <p className="mt-1 text-slate-500">Kickoff: {agoLabel(match.kickoff_at)}</p>
                <p className="mt-3 text-sm text-slate-300">Status: {match.status}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/10">
          <h2 className="text-xl font-semibold text-white">Leaderboard snapshot</h2>
          <p className="mt-2 text-slate-400">Check the top predictors after every settlement.</p>
          <div className="mt-5 space-y-3">
            {matchesQuery.isError && <p className="text-rose-300">Unable to load leaderboard preview.</p>}
            <p className="text-sm text-slate-500">Visit the Leaderboard page for the full ranking.</p>
          </div>
        </article>
      </section>
    </div>
  )
}
