import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../state/useAuthStore'
import { useNotificationStore } from '../state/useNotificationStore'

const authSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type AuthForm = z.infer<typeof authSchema>

export function AuthPage() {
  const navigate = useNavigate()
  const setAuthState = useAuthStore((state) => state.setAuthState)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const addNotification = useNotificationStore((state) => state.addNotification)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthForm>({ resolver: zodResolver(authSchema) })

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        setAuthState(data.session.user, data.session)
        navigate('/')
      }
    }
    check()
  }, [navigate, setAuthState])

  const onSubmit = async (data: AuthForm) => {
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: data.email, password: data.password })
        if (error) throw error
        addNotification('Check your email for a confirmation link.', 'success')
      } else {
        const { data: sessionData, error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
        if (error) throw error
        if (sessionData.session?.user) {
          setAuthState(sessionData.session.user, sessionData.session)
          navigate('/')
        }
      }
    } catch (error) {
      addNotification((error as Error).message, 'error')
    }
  }

  const onGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) {
      addNotification(error.message, 'error')
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-950/95 p-8 shadow-2xl shadow-black/30">
      <h1 className="text-3xl font-semibold text-white">FIFA 2026 Predictor</h1>
      <p className="mt-2 text-sm text-slate-400">
        {mode === 'signup' ? 'Create an account. Password must be at least 6 characters.' : 'Sign in to place predictions.'}
      </p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block text-sm text-slate-300">
          Email
          <input type="email" autoComplete="email" {...register('email')} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-400" />
          {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p>}
        </label>
        <label className="block text-sm text-slate-300">
          Password
          <input type="password" autoComplete="current-password" minLength={6} {...register('password')} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-400" />
          {errors.password && <p className="mt-1 text-xs text-rose-300">{errors.password.message}</p>}
        </label>
        <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50">
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <div className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-400">
        <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="underline-offset-4 hover:underline">
          {mode === 'signin' ? 'Need an account?' : 'Already registered?'}
        </button>
        <button type="button" onClick={onGoogleSignIn} className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 hover:bg-slate-800">
          Continue with Google
        </button>
      </div>
    </div>
  )
}
