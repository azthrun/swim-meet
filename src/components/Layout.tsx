import { Link, Outlet } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import type { Lang } from '../lib/dates'

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中文' },
]

/** Content column: full width on a phone, centred on desktop. */
export const CONTAINER = 'mx-auto w-full max-w-desktop'

function LanguageToggle() {
  const { lang, setLang, m } = useI18n()
  return (
    <div role="group" aria-label={m.language} className="inline-flex rounded-full bg-canvas">
      {LANGS.map(({ value, label }) => {
        const on = value === lang
        return (
          <button
            key={value}
            type="button"
            lang={value === 'zh' ? 'zh-Hans' : 'en'}
            aria-pressed={on}
            onClick={() => setLang(value)}
            className={`h-11 min-w-14 rounded-full border-0 px-sm type-button ${
              on ? 'bg-card text-ink shadow-soft' : 'bg-transparent text-muted'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function Layout() {
  const { m } = useI18n()
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex-none border-b border-hairline bg-card">
        <div className={`flex h-[60px] items-center gap-sm px-md ${CONTAINER}`}>
          <Link
            to="/"
            className="flex-1 text-[length:var(--size-title)] leading-none font-bold tracking-[-0.8px] text-heading no-underline"
          >
            {m.appName}
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <Outlet />
    </div>
  )
}
