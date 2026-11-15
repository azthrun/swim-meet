import { createContext, useContext } from 'react'

/** `done` says something worked, `off` that something was turned off, `error` that it failed. */
export type ToastTone = 'done' | 'off' | 'error'

/** Shows a short message at the bottom of the screen; a "saved" one unless told otherwise. */
export type ShowToast = (message: string, tone?: ToastTone) => void

export const ToastContext = createContext<ShowToast | null>(null)

export function useToast(): ShowToast {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
