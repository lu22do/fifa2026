import { create } from 'zustand'

export interface Notification {
  id: string
  message: string
  variant: 'success' | 'error' | 'info'
}

interface NotificationStore {
  notifications: Notification[]
  addNotification: (message: string, variant: Notification['variant']) => void
  removeNotification: (id: string) => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (message, variant) => {
    const id = crypto.randomUUID()
    set((state) => ({ notifications: [...state.notifications, { id, message, variant }] }))
    setTimeout(() => set((state) => ({ notifications: state.notifications.filter((item) => item.id !== id) })), 4500)
  },
  removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter((item) => item.id !== id) })),
}))
