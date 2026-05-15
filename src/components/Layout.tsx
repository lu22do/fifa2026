import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../state/useAuthStore'
import { supabase } from '../lib/supabase'

const activeClass = 'rounded-full bg-slate-800 px-3 py-1 text-sky-300'
const defaultClass = 'rounded-full px-3 py-1 text-slate-300 hover:bg-slate-800 hover:text-white'

export function Layout() {
  const profile = useAuthStore((state) => state.profile)

  const onSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div>
          <Link to="/" className="text-lg font-semibold text-sky-300">
            FIFA 2026 Bets
          </Link>
          <p className="text-sm text-slate-400">dynamic prediction platform</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <NavLink to="/" className={({ isActive }) => (isActive ? activeClass : defaultClass)}>
            Dashboard
          </NavLink>
          <NavLink to="/matches" className={({ isActive }) => (isActive ? activeClass : defaultClass)}>
            Matches
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? activeClass : defaultClass)}>
            Leaderboard
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? activeClass : defaultClass)}>
            Profile
          </NavLink>
          {profile?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? activeClass : defaultClass)}>
              Admin
            </NavLink>
          )}
          <button onClick={onSignOut} className="rounded-full bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700">
            Sign out
          </button>
        </nav>
      </div>
    </header>
  )
}
