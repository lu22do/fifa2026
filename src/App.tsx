import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './state/useAuthStore'
import { useNotificationStore } from './state/useNotificationStore'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { MatchesPage } from './pages/MatchesPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminPage } from './pages/AdminPage'
import { Layout } from './components/Layout'
import { NotificationToast } from './components/NotificationToast'

function App() {
  const location = useLocation()
  const { user, profile, setAuthState, clearAuth } = useAuthStore()
  const addNotification = useNotificationStore((state) => state.addNotification)

  useEffect(() => {
    const init = async () => {
      const sessionResponse = await supabase.auth.getSession()
      const session = sessionResponse.data.session
      if (session?.user) {
        setAuthState(session.user, session)
      }
    }

    init()
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setAuthState(session.user, session)
      } else {
        clearAuth()
      }
      if (event === 'SIGNED_OUT') {
        addNotification('Signed out successfully.', 'success')
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [addNotification, clearAuth, setAuthState])

  const signedIn = Boolean(user)
  const needsProfile = signedIn && profile?.display_name?.trim() === ''

  if (!signedIn && location.pathname !== '/auth') {
    return <Navigate to="/auth" replace />
  }

  if (signedIn && location.pathname === '/auth') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NotificationToast />
      {signedIn && <Layout />}
      <main className={signedIn ? 'px-4 py-6 lg:px-8' : 'px-4 py-6'}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={signedIn ? <DashboardPage /> : <Navigate to="/auth" />} />
          <Route path="/matches" element={signedIn ? <MatchesPage /> : <Navigate to="/auth" />} />
          <Route path="/leaderboard" element={signedIn ? <LeaderboardPage /> : <Navigate to="/auth" />} />
          <Route path="/profile" element={signedIn ? <ProfilePage /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={signedIn && profile?.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to={signedIn ? '/' : '/auth'} />} />
        </Routes>
      </main>
      {needsProfile && signedIn && (
        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-2xl bg-slate-800 px-5 py-4 shadow-xl shadow-black/40 ring-1 ring-white/10">
          <p className="text-sm text-slate-300">Complete your profile in the Profile page to get full access.</p>
        </div>
      )}
    </div>
  )
}

export default App
