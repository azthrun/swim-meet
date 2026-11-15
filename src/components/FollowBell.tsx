import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  BellOff,
  BellRing,
  CircleCheck,
  LoaderCircle,
  RotateCw,
  Share,
  SlidersHorizontal,
  Smartphone,
  SquarePlus,
  Timer,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { followedSwimmers, followSwimmer, pushSupport, unfollowSwimmer } from '../data/push'
import type { Swimmer } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { Sheet } from './feedback'
import { useToast } from './ToastContext'
import { buttonClass, iconButtonClass } from './ui'

const FOLLOWED = ['followedSwimmers']

type Panel = 'ask' | 'blocked' | 'homeScreen' | null

function currentPermission(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'default'
}

/**
 * The bell in the Swimmer header: follows the swimmer on this device, so it shows a notification
 * for each new live or official time. Hidden where the browser has no push at all.
 */
export function FollowBell({ swimmer }: { swimmer: Swimmer }) {
  const { m, fill, pick } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [support] = useState(pushSupport)
  const [permission, setPermission] = useState(currentPermission)
  const [panel, setPanel] = useState<Panel>(null)
  const name = pick(swimmer.display_name, swimmer.display_name_zh)

  // Notifications may have been allowed or blocked in the site settings meanwhile.
  useEffect(() => {
    const refresh = () => setPermission(currentPermission())
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const followed = useQuery({
    queryKey: FOLLOWED,
    queryFn: followedSwimmers,
    enabled: support === 'supported' && permission === 'granted',
  })
  const following = permission === 'granted' && (followed.data?.includes(swimmer.id) ?? false)

  // The swimmer travels with the variables, so a toggle still pending names the one it was for.
  const toggle = useMutation({
    mutationFn: ({ follow, id }: { follow: boolean; id: string; name: string }) =>
      follow ? followSwimmer(id) : unfollowSwimmer(id),
    // A refetch landing after the toggle would overwrite it with the old list.
    onMutate: () => queryClient.cancelQueries({ queryKey: FOLLOWED }),
    onSuccess: (_, { follow, id, name }) => {
      queryClient.setQueryData<string[]>(FOLLOWED, (ids = []) => [
        ...ids.filter((other) => other !== id),
        ...(follow ? [id] : []),
      ])
      toast(fill(follow ? m.followed : m.unfollowed, { name }), follow ? 'done' : 'off')
    },
    onError: (error, { follow }) => {
      console.error(error)
      toast(follow ? m.followFailed : m.unfollowFailed, 'error')
    },
    // The server's list wins: a resubscribe may have moved this device to a new endpoint.
    onSettled: () => queryClient.invalidateQueries({ queryKey: FOLLOWED }),
  })
  const mutate = (follow: boolean) => toggle.mutate({ follow, id: swimmer.id, name })

  if (support === 'unsupported') return null

  const blocked = support === 'supported' && permission === 'denied'
  const busy = toggle.isPending || (followed.isLoading && followed.fetchStatus !== 'idle')
  const label = blocked
    ? m.notificationsBlocked
    : fill(following ? m.unfollowSwimmer : m.followSwimmer, { name })
  const Icon = toggle.isPending ? LoaderCircle : blocked ? BellOff : following ? BellRing : Bell

  function onBell() {
    // Not `disabled`: that would drop keyboard and screen-reader focus mid-toggle.
    if (busy) return
    if (support === 'needsHomeScreen') setPanel('homeScreen')
    else if (blocked) setPanel('blocked')
    else if (following) mutate(false)
    else if (permission === 'granted') mutate(true)
    else setPanel('ask')
  }

  async function turnOn() {
    setPanel(null)
    // Straight from the tap: browsers only show the prompt in answer to one.
    const answer = await Notification.requestPermission()
    setPermission(answer)
    if (answer === 'granted') mutate(true)
  }

  const close = () => setPanel(null)

  return (
    <>
      <button
        type="button"
        onClick={onBell}
        aria-busy={busy}
        aria-label={label}
        title={label}
        className={iconButtonClass}
      >
        <Icon
          size={20}
          aria-hidden="true"
          className={toggle.isPending ? 'animate-spin' : blocked ? 'text-muted' : following ? 'text-primary' : ''}
        />
      </button>
      {panel === 'ask' ? (
        <Sheet
          title={fill(m.followTitle, { name })}
          steps={[
            { icon: Timer, text: m.followLive },
            { icon: CircleCheck, text: m.followOfficial },
            { icon: Smartphone, text: m.followThisDevice },
          ]}
          note={m.followNote}
          onClose={close}
          actions={
            <>
              <button type="button" onClick={() => void turnOn()} className={buttonClass('primary', 'lg', true)}>
                <Bell size={18} aria-hidden="true" />
                {m.turnOnNotifications}
              </button>
              <button type="button" onClick={close} className={buttonClass('secondary', 'lg', true)}>
                {m.notNow}
              </button>
            </>
          }
        >
          {fill(m.followBody, { name })}
        </Sheet>
      ) : panel === 'blocked' ? (
        <Sheet
          title={m.notificationsBlocked}
          steps={[
            { icon: SlidersHorizontal, text: m.blockedSiteSettings },
            { icon: Bell, text: m.blockedAllow },
            { icon: RotateCw, text: m.blockedReload },
          ]}
          note={m.blockedIphone}
          onClose={close}
          actions={
            <button type="button" onClick={close} className={buttonClass('primary', 'lg', true)}>
              {m.gotIt}
            </button>
          }
        >
          {m.blockedBody}
        </Sheet>
      ) : panel === 'homeScreen' ? (
        <Sheet
          title={m.homeScreenTitle}
          steps={[
            { icon: Share, text: m.homeScreenShare },
            { icon: SquarePlus, text: m.homeScreenAdd },
            { icon: Bell, text: m.homeScreenOpen },
          ]}
          note={m.homeScreenNeeds}
          onClose={close}
          actions={
            <button type="button" onClick={close} className={buttonClass('primary', 'lg', true)}>
              {m.gotIt}
            </button>
          }
        >
          {m.homeScreenBody}
        </Sheet>
      ) : null}
    </>
  )
}
