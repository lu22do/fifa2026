import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { useAuthStore } from '../state/useAuthStore'
import { useNotificationStore } from '../state/useNotificationStore'

const profileSchema = z.object({
  display_name: z.string().min(3, 'Display name must be at least 3 characters'),
})

type ProfileForm = z.infer<typeof profileSchema>

export function ProfilePage() {
  const queryClient = useQueryClient()
  const profile = useAuthStore((state) => state.profile)
  const setProfile = useAuthStore((state) => state.setProfile)
  const addNotification = useNotificationStore((state) => state.addNotification)
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null)

  const { register, handleSubmit, formState } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { display_name: profile?.display_name ?? '' },
  })

  const profileQuery = useQuery<{ profile: import('../lib/types').UserProfile }, Error>({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  })

  const betsQuery = useQuery<{ bets: Array<Record<string, any>> }, Error>({
    queryKey: ['bets'],
    queryFn: api.getBets,
  })

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { display_name: string }) => api.updateProfile(payload.display_name),
    onSuccess: (data) => {
      setProfile(data.profile)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      addNotification('Profile updated successfully.', 'success')
    },
    onError: (error) => addNotification((error as Error).message, 'error'),
  })

  const updateProfile = handleSubmit((data) => updateProfileMutation.mutate(data))

  useEffect(() => {
    if (profileQuery.error) {
      addNotification(profileQuery.error.message, 'error')
    }
    if (profileQuery.data) {
      setProfile(profileQuery.data.profile)
    }
  }, [profileQuery.data, profileQuery.error, addNotification, setProfile])

  const activeBets = useMemo(() => betsQuery.data?.bets ?? [], [betsQuery.data])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/10">
        <h1 className="text-3xl font-semibold text-white">Profile</h1>
        <p className="mt-2 text-slate-400">Manage your display name and review your bet history.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Your account</p>
            <p className="mt-4 text-lg text-white">{profile?.display_name ?? 'Player'}</p>
            <p className="mt-2 text-slate-300">Role: {profile?.role}</p>
            <p className="mt-2 text-slate-300">Total points: {profile?.total_points ?? 0}</p>
          </div>
          <form onSubmit={updateProfile} className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
            <label className="block text-sm font-medium text-slate-200">Display name</label>
            <input
              type="text"
              defaultValue={profile?.display_name ?? ''}
              {...register('display_name')}
              className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            />
            {formState.errors.display_name && <p className="mt-2 text-sm text-rose-300">{formState.errors.display_name.message}</p>}
            <button type="submit" className="mt-4 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400">
              Save profile
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Bet history</h2>
            <p className="mt-2 text-slate-400">Review every prediction and change entry.</p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-slate-300">Total bets: {activeBets.length}</span>
        </div>

        <div className="mt-6 space-y-4">
          {activeBets.length === 0 && <p className="text-slate-400">No predictions placed yet.</p>}
          {activeBets.map((bet) => (
            <div key={bet.id} className="rounded-3xl border border-slate-800 bg-slate-900/95 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-400">Category: {bet.betting_category}</p>
                  <p className="mt-1 text-lg font-semibold text-white">Selection: {bet.selection}</p>
                </div>
                <div className="text-right text-sm text-slate-300">
                  <p>Status: {bet.status}</p>
                  <p>Points locked: {bet.points_locked}</p>
                </div>
              </div>
              {bet.bet_history?.length ? (
                <div className="mt-4 rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-300">
                  <p className="font-medium text-slate-100">Change history</p>
                  <ul className="mt-3 space-y-2">
                    {(bet.bet_history as Array<any>).map((entry) => (
                      <li key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-slate-400">{entry.event_type} · {new Date(entry.changed_at).toLocaleString()}</p>
                        <p className="mt-1">{entry.old_selection ? `${entry.old_selection} → ` : ''}{entry.new_selection}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
