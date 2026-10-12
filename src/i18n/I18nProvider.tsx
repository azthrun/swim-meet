import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from '../lib/dates'
import { en } from './en'
import { I18nContext, type I18n } from './I18nContext'
import { zh } from './zh'

const STORAGE_KEY = 'swim-meet.lang'
const MESSAGES = { en, zh }

function storedLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'zh' ? 'zh' : 'en'
  } catch {
    return 'en'
  }
}

function fill(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(storedLang)

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en'
    document.title = MESSAGES[lang].appName
  }, [lang])

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang(next) {
        setLangState(next)
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // Private browsing: the choice lasts for this visit only.
        }
      },
      m: MESSAGES[lang],
      fill,
      plural: (message, n) => fill(n === 1 ? message.one : message.other, { n }),
      name: (row) => (row ? (lang === 'zh' && row.name_zh) || row.name_en : ''),
      pick: (name, nameZh) => (lang === 'zh' && nameZh) || name,
    }),
    [lang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
