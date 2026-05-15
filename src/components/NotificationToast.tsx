import { useNotificationStore } from '../state/useNotificationStore'

export function NotificationToast() {
  const notifications = useNotificationStore((state) => state.notifications)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {notifications.map(({ id, message, variant }) => (
        <div key={id} className="rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-xl shadow-black/30">
          <p className="text-sm text-slate-100">
            <span className={variant === 'success' ? 'text-emerald-300' : variant === 'error' ? 'text-rose-300' : 'text-sky-300'}>
              {variant.toUpperCase()}:
            </span>{' '}
            {message}
          </p>
        </div>
      ))}
    </div>
  )
}
