import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useNotificationStore } from '../state/useNotificationStore'

export function LeaderboardPage() {
  const addNotification = useNotificationStore((state) => state.addNotification)
  const leaderboardQuery = useQuery<{ leaderboard: import('../lib/types').LeaderboardEntry[] }, Error>({
    queryKey: ['leaderboard'],
    queryFn: api.getLeaderboard,
  })

  useEffect(() => {
    if (leaderboardQuery.error) {
      addNotification(leaderboardQuery.error.message, 'error')
    }
  }, [leaderboardQuery.error, addNotification])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/10">
        <h1 className="text-3xl font-semibold text-white">Global leaderboard</h1>
        <p className="mt-2 text-slate-400">Players are ranked by total points, with correct predictions highlighted.</p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl shadow-black/20">
        <table className="min-w-full divide-y divide-slate-800 text-left">
          <thead className="bg-slate-950/95">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-400">Rank</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-400">Player</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-400">Points</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-400">Correct predictions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {leaderboardQuery.data?.leaderboard.map((player, index) => (
              <tr key={player.id} className="border-b border-slate-800">
                <td className="px-6 py-4 text-sm text-slate-200">#{index + 1}</td>
                <td className="px-6 py-4 text-sm text-white">{player.display_name}</td>
                <td className="px-6 py-4 text-sm text-sky-300">{player.total_points}</td>
                <td className="px-6 py-4 text-sm text-slate-300">{player.correct_predictions}</td>
              </tr>
            ))}
            {leaderboardQuery.data?.leaderboard.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm text-slate-400">No leaderboard data available yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
