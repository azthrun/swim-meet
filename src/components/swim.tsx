import {
  ArrowDown,
  ArrowUp,
  CloudOff,
  ExternalLink,
  Flag,
  LoaderCircle,
  MapPin,
  Minus,
  RotateCw,
  Users,
  WifiOff,
} from 'lucide-react'
import { useCallback } from 'react'
import { useLookups, type Lookups, type Meet, type Result } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import type { PersonalBestBadge as Badge } from '../lib/entries'
import { SWUM } from '../lib/personalBests'
import { DQ, resultOfDraft, type PendingResult } from '../lib/results'
import { formatDrop, formatTime } from '../lib/time'
import { BadgePill, buttonClass, EmptyState } from './ui'

/** "50 Freestyle" / "50 自由泳". */
export function useEventLabel(lookups: Lookups) {
  const { name } = useI18n()
  return (eventId: number) => {
    const event = lookups.event.get(eventId)
    return event ? `${event.distance} ${name(lookups.stroke.get(event.stroke_code))}` : ''
  }
}

/** A status in as few letters as the language has for it: English writes Disqualified as its code. */
export function useStatusLabel(lookups: Lookups | undefined) {
  const { lang, name } = useI18n()
  return useCallback(
    (code: string) => (lang === 'en' && code === DQ ? code : name(lookups?.status.get(code))),
    [lang, name, lookups],
  )
}

/** "50 Freestyle 29.48", "50 Freestyle DQ 29.48", or the event alone when there is nothing else to say. */
export function useResultLabel(lookups: Lookups | undefined) {
  const { name } = useI18n()
  const statusLabel = useStatusLabel(lookups)
  return useCallback(
    (eventId: number, result: Result | null) => {
      const event = lookups?.event.get(eventId)
      const cs = result?.official_time_cs ?? result?.live_time_cs ?? null
      return [
        event ? `${event.distance} ${name(lookups?.stroke.get(event.stroke_code))}` : null,
        result && result.status_code !== SWUM ? statusLabel(result.status_code) : null,
        cs === null ? null : formatTime(cs),
      ]
        .filter(Boolean)
        .join(' ')
    },
    [lookups, name, statusLabel],
  )
}

/**
 * A save that has not reached the database, in words. Written in the language on screen now,
 * not the one it was typed in: a failed save can sit on the phone across a change of language.
 */
export function usePendingLabel() {
  const lookups = useLookups().data
  const resultLabel = useResultLabel(lookups)
  return useCallback(
    (save: Pick<PendingResult, 'eventId' | 'draft' | 'label'>) =>
      lookups && save.eventId !== undefined ? resultLabel(save.eventId, resultOfDraft(save.draft)) : save.label,
    [lookups, resultLabel],
  )
}

export function CourseBadge({ code, lookups }: { code: string; lookups: Lookups }) {
  const { name } = useI18n()
  return (
    <BadgePill ring="solid" title={name(lookups.course.get(code))}>
      {code}
    </BadgePill>
  )
}

export function RelayBadge() {
  const { m } = useI18n()
  return <BadgePill dot="bg-accent-teal">{m.relay}</BadgePill>
}

export function RelayTile() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-10 flex-none items-center justify-center rounded-md bg-accent-teal text-white"
    >
      <Users size={20} />
    </span>
  )
}

export function UnofficialBadge() {
  const { m } = useI18n()
  return <BadgePill ring="dashed">{m.unofficial}</BadgePill>
}

export function PersonalBestBadge({ badge }: { badge: Badge }) {
  const { m } = useI18n()
  if (badge === 'best') {
    return (
      <BadgePill tone="primary" ring="solid" dot="bg-accent-green">
        {m.personalBest}
      </BadgePill>
    )
  }
  if (badge === 'provisional') {
    return (
      <BadgePill ring="dashed" dot="bg-accent-green">
        {m.provisionalPersonalBest}
      </BadgePill>
    )
  }
  return null
}

/** Drop against the seed time. `long` spells out "faster than seed". */
export function Drop({ deltaCs, long = false }: { deltaCs: number; long?: boolean }) {
  const { m } = useI18n()
  const [Icon, color, label] =
    deltaCs < 0
      ? [ArrowDown, 'text-accent-green', long ? m.fasterThanSeed : m.faster]
      : deltaCs > 0
        ? [ArrowUp, 'text-accent-orange', long ? m.slowerThanSeed : m.slower]
        : [Minus, 'text-faint', long ? m.sameAsSeed : m.same]
  return (
    <span className="inline-flex items-center gap-xxs type-caption font-semibold tabular text-ink">
      <Icon size={16} aria-hidden="true" className={`flex-none ${color}`} />
      <span>{formatDrop(deltaCs)}</span>
      <span className="font-normal text-muted">{label}</span>
    </span>
  )
}

/** Says that the result on show has not reached the database: being saved, or failed and kept. */
export function PendingMark({
  state,
  tappable = false,
}: {
  state: PendingResult['state'] | undefined
  tappable?: boolean
}) {
  const { m } = useI18n()
  if (state === 'saving') {
    return (
      <span role="status" className="inline-flex items-center gap-xxs type-caption text-secondary">
        <LoaderCircle size={16} aria-hidden="true" className="flex-none animate-spin" />
        {m.saving}
      </span>
    )
  }
  if (state === 'failed') {
    return (
      <span className="inline-flex items-center gap-xxs type-caption font-semibold text-ink">
        <CloudOff size={16} aria-hidden="true" className="flex-none text-accent-orange" />
        {tappable ? m.notSavedTapRetry : m.notSavedYet}
      </span>
    )
  }
  return null
}

/** How an entry ended when it was not simply swum: DQ, No Show, Scratched. */
export function StatusBlock({
  statusCode,
  timeCs,
  lookups,
  align = 'end',
}: {
  statusCode: string
  timeCs: number | null
  lookups: Lookups
  align?: 'start' | 'end'
}) {
  const { m, name } = useI18n()
  const full = name(lookups.status.get(statusCode))
  const short = useStatusLabel(lookups)(statusCode)
  const detail = timeCs === null ? m.noTime : formatTime(timeCs)
  return (
    <div className={`flex flex-col gap-xxs ${align === 'end' ? 'items-end text-right' : 'items-start'}`}>
      <span className="inline-flex items-center gap-xs rounded-md border border-input px-sm py-xxs type-title text-secondary">
        <Flag size={16} aria-hidden="true" />
        {short}
      </span>
      <span className="type-caption tabular text-muted">{short === full ? detail : `${full} · ${detail}`}</span>
    </div>
  )
}

export function MeetPlace({ meet }: { meet: Meet }) {
  if (!meet.location) return null
  return (
    <div className="flex items-center gap-xs type-body-sm text-muted">
      <MapPin size={16} aria-hidden="true" className="flex-none" />
      <span>{meet.location}</span>
    </div>
  )
}

export function LiveResultsLink({ meet }: { meet: Meet }) {
  const { m } = useI18n()
  // Only http(s) links are followed; the field is free text typed by an editor.
  if (!meet.results_url || !/^https?:\/\//i.test(meet.results_url)) return null
  return (
    <a
      href={meet.results_url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-xs self-start type-body-sm"
    >
      <ExternalLink size={16} aria-hidden="true" />
      <span>{m.liveResults}</span>
    </a>
  )
}

export function LoadFailed({ title, onRetry }: { title?: string; onRetry: () => void }) {
  const { m } = useI18n()
  return (
    <div className="flex flex-col gap-md">
      <EmptyState icon={WifiOff} title={title ?? m.loadFailedTitle}>
        {m.loadFailedBody}
      </EmptyState>
      <button type="button" onClick={onRetry} className={buttonClass('primary', 'lg', true)}>
        <RotateCw size={18} aria-hidden="true" />
        {m.tryAgain}
      </button>
    </div>
  )
}
