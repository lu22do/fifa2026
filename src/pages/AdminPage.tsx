import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { useNotificationStore } from '../state/useNotificationStore'

const matchSchema = z.object({
  home_team_id: z.string().min(1),
  away_team_id: z.string().min(1),
  stage: z.string().min(1),
  kickoff_at: z.string().min(1),
  venue: z.string().optional(),
})

type MatchForm = z.infer<typeof matchSchema>

function formatDateTime(value: string) {
  const date = new Date(value)
  return date.toLocaleString()
}

export function AdminPage() {
  const queryClient = useQueryClient()
  const addNotification = useNotificationStore((state) => state.addNotification)
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)

  const matchesQuery = useQuery<import('../lib/api').MatchesResponse, Error>({
    queryKey: ['matches'],
    queryFn: api.getMatches,
  })

  const createMatchMutation = useMutation({
    mutationFn: api.createMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      addNotification('Match created.', 'success')
    },
    onError: (error) => addNotification((error as Error).message, 'error'),
  })

  const updateMatchMutation = useMutation({
    mutationFn: (payload: { matchId: string; values: Record<string, any> }) => api.updateMatch(payload.matchId, payload.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      addNotification('Match updated.', 'success')
    },
    onError: (error) => addNotification((error as Error).message, 'error'),
  })

  const settleMatchMutation = useMutation({
    mutationFn: (matchId: string) => api.settleMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      queryClient.invalidateQueries({ queryKey: ['bets'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      addNotification('Match settled.', 'success')
    },
    onError: (error) => addNotification((error as Error).message, 'error'),
  })

  const { register, handleSubmit, reset, formState } = useForm<MatchForm>({ resolver: zodResolver(matchSchema) })

  const onSubmit = handleSubmit((values) => {
    createMatchMutation.mutate(values)
    reset()
  })

  const matches = matchesQuery.data?.matches ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/10">
        <h1 className="text-3xl font-semibold text-white">Admin panel</h1>
        <p className="mt-2 text-slate-400">Create and settle matches, manage status, and oversee the prediction workflow.</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
          <h2 className="text-xl font-semibold text-white">Create match</h2>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm text-slate-200">
              Home team ID
              <input type="text" {...register('home_team_id')} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" />
            </label>
            <label className="block text-sm text-slate-200">
              Away team ID
              <input type="text" {...register('away_team_id')} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" />
            </label>
            <label className="block text-sm text-slate-200">
              Stage
              <input type="text" {...register('stage')} placeholder="group, round_of_16, quarter_final, semi_final, third_place, final" className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" />
            </label>
            <label className="block text-sm text-slate-200">
              Kickoff time
              <input type="datetime-local" {...register('kickoff_at')} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" />
            </label>
            <label className="block text-sm text-slate-200">
              Venue
              <input type="text" {...register('venue')} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" />
            </label>
            <button type="submit" className="mt-4 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400">
              Create match
            </button>
            {formState.errors.home_team_id && <p className="text-sm text-rose-300">{formState.errors.home_team_id.message}</p>}
          </form>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
          <h2 className="text-xl font-semibold text-white">Match list</h2>
          <div className="mt-6 space-y-4">
            {matches.length === 0 && <p className="text-slate-400">No matches have been added yet.</p>}
            {matches.map((match) => (
              <div key={match.id} className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">{match.stage.replaceAll('_', ' ')}</p>
                    <p className="mt-1 text-lg text-white">{match.home_team_id} vs {match.away_team_id}</p>
                    <p className="text-sm text-slate-500">{formatDateTime(match.kickoff_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => settleMatchMutation.mutate(match.id)}
                      className="rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                      Settle
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
