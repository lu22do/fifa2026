import { apiBase } from './supabase'
import type { LeaderboardEntry, UserProfile } from './types'
import { useAuthStore } from '../state/useAuthStore'

async function fetchJson<T = unknown>(path: string, init: RequestInit = {}) {
  const store = useAuthStore.getState()
  const token = store.session?.access_token
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers ?? {}),
  }
  const response = await fetch(`${apiBase}${path}`, { ...init, headers })
  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'API request failed')
  }
  return response.json() as Promise<T>
}

export interface MatchesResponse {
  matches: Array<Record<string, any>>
  teams: Array<Record<string, any>>
  categoryPoints: Array<Record<string, any>>
}

export const api = {
  getMatches: () => fetchJson<MatchesResponse>('/matches'),
  getBets: () => fetchJson<{ bets: Array<Record<string, any>> }>('/bets'),
  getLeaderboard: () => fetchJson<{ leaderboard: LeaderboardEntry[] }>('/leaderboard'),
  getProfile: () => fetchJson<{ profile: UserProfile }>('/me'),
  updateProfile: (display_name: string) => fetchJson<{ profile: UserProfile }>('/users/profile', {
    method: 'PUT',
    body: JSON.stringify({ display_name }),
  }),
  placeBet: (payload: { matchId: string; bettingCategory: string; selection: string }) =>
    fetchJson<{ bet: Record<string, any> }>('/bets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  settleMatch: (matchId: string) => fetchJson('/matches/' + matchId + '/settle', { method: 'POST' }),
  createMatch: (payload: Record<string, any>) => fetchJson('/matches', { method: 'POST', body: JSON.stringify(payload) }),
  updateMatch: (matchId: string, payload: Record<string, any>) => fetchJson('/matches/' + matchId, { method: 'PATCH', body: JSON.stringify(payload) }),
}
