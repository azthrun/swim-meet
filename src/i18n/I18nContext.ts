import { createContext, useContext } from 'react'
import type { Lang } from '../lib/dates'
import type { Messages } from './en'

export type Named = { name_en: string; name_zh: string | null }
export type Plural = { one: string; other: string }

export type I18n = {
  lang: Lang
  setLang: (lang: Lang) => void
  /** UI chrome. */
  m: Messages
  /** Fills `{name}` placeholders in a message. */
  fill: (message: string, values: Record<string, string | number>) => string
  plural: (message: Plural, n: number) => string
  /** A lookup row's name in the current language. */
  name: (row: Named | undefined) => string
  /** A free-text name with an optional Chinese version; a missing one falls back. */
  pick: (name: string, nameZh: string | null | undefined) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
