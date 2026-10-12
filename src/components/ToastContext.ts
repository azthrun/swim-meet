import { createContext, useContext } from 'react'

/** Shows a short "saved" message at the bottom of the screen. */
export type ShowToast = (message: string) => void

export const ToastContext = createContext<ShowToast | null>(null)

export function useToast(): ShowToast {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
