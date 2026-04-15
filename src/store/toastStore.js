// Toast store — manages a queue of transient notification messages.
//
// Why a Zustand store instead of a Context?
//   The Axios response interceptor runs outside of React, so it cannot call
//   a Context-based hook.  Zustand's getState() API lets non-React code
//   (interceptors, utility functions) dispatch toasts without a Provider.
//
// Usage inside React:
//   const { addToast } = useToastStore()
//   addToast({ message: 'Kaydedildi!', type: 'success' })
//
// Usage outside React (e.g. Axios interceptor):
//   import useToastStore from '../store/toastStore'
//   useToastStore.getState().addToast({ message: 'Hata!', type: 'error' })
import { create } from 'zustand'

// Module-level counter — avoids collisions between toasts created in the
// same millisecond (Date.now() alone is not unique enough under rapid calls).
let _id = 0

const useToastStore = create((set) => ({
  toasts: [],

  // addToast — pushes a new toast and schedules its removal.
  // type    : 'error' | 'success' | 'warning' | 'info'  (default: 'error')
  // duration: ms before auto-dismiss; 0 means "stay until manually closed"
  addToast: ({ message, type = 'error', duration = 4000 }) => {
    const id = ++_id
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    if (duration > 0) {
      setTimeout(
        () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        duration,
      )
    }
  },

  // removeToast — immediately dismisses a toast by id (used by the × button).
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export default useToastStore
