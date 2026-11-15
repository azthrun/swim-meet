# Follow a swimmer: record notifications (#25)

Added to the "Swim Meet" canvas on 2026-11-15. The canvas renders artboards in a cross-origin
frame, so this file records them in words instead of `.dc.html` markup.

Artboards: `Follow · bell states, sheets and toasts · EN`, `… · 中文`,
`Follow · iPhone add to Home Screen first · EN + 中文`,
`Follow · the system notification (reference) and icons`. There is no desktop artboard: the bell
is the same IconButton there, with its label as a hover tooltip.

## Bell (Swimmer header)

A 44px DreamBig IconButton (`bg-translucent`, 20px Lucide icon) between the swimmer's name and
the Settings gear. Everyone sees it.

| # | State | Icon | Then |
|---|---|---|---|
| 1 | Not following | `Bell`, ink | Tap: sheet "Get notified…" if the browser hasn't been asked yet, else follow |
| 2 | First tap | — | Bottom sheet below; "Turn on notifications" opens the browser's own prompt |
| 3 | Working | spinning loader | Subscribing or unsubscribing |
| 4 | Following | `BellRing`, primary blue | Toast: "You'll be notified when {name} has a new time." |
| 5 | Unfollowed | `Bell` | Toast with `BellOff`: "Notifications for {name} are off." |
| 6 | Couldn't turn on | `Bell` (goes back) | Toast with orange `TriangleAlert`: "Couldn't turn on notifications. Try again." |
| 7 | Blocked | `BellOff`, muted | Tap: sheet "Notifications are blocked" |
| 8 | Not supported | — | The bell is hidden |

中文: 有新成绩时会通知你 / 已关闭通知 / 无法开启通知，请重试

## Sheets (bottom sheet, grab handle, heading, rows with a 32px icon tile)

**Get notified about {name}'s new times** / 接收新成绩通知
This device shows a notification when {name} gets a new live or official time. Tap it to open
{name}'s results. / {name} 有新的现场成绩或正式成绩时，这台设备会收到通知。点开通知即可查看成绩。
- `Timer` Live times, as parents enter them at the pool / 家长在泳池边录入的现场成绩
- `CircleCheck` Official times, once they're posted / 公布后的正式成绩
- `Smartphone` Only on this device. No account needed. / 只在这台设备上，无需账号
Footnote: Next, your browser asks for permission. Turn it off any time with the bell. /
接下来浏览器会请求通知权限。随时可以点铃铛关闭。
Buttons: primary `Bell` Turn on notifications / 开启通知 · secondary Not now / 以后再说

**Notifications are blocked** / 通知已被阻止
Your browser is blocking notifications from Swim Meet. To allow them: / 浏览器阻止了 Swim Meet 的通知。开启方法：
1. `SlidersHorizontal` Open this site's settings: tap the icon next to the web address. / 打开本网站的设置：点网址旁边的图标。
2. `Bell` Set Notifications to Allow. / 把"通知"设为"允许"。
3. `RotateCw` Reload the page and tap the bell again. / 刷新页面，再点一次铃铛。
Footnote: Opened Swim Meet from your iPhone Home Screen? Go to Settings → Notifications → Swim Meet. /
从 iPhone 主屏幕打开 Swim Meet？请前往 设置 → 通知 → Swim Meet。
Button: Got it / 知道了

**Add to Home Screen first** / 先添加到主屏幕 (iPhone, browser tab (not an in-app browser), not yet on the Home Screen)
On iPhone, notifications only work when Swim Meet is opened from your Home Screen. /
在 iPhone 上，只有从主屏幕打开 Swim Meet 才能收到通知。
1. `Share` Tap Share in your browser's toolbar. / 点击分享 ("your browser", not "Safari": Chrome, Edge and Firefox on iOS 16.4+ add to the Home Screen from their Share menu too)
2. `SquarePlus` Choose "Add to Home Screen". / 选择"添加到主屏幕"
3. `Bell` Open Swim Meet from your Home Screen and tap the bell again. / 从主屏幕打开 Swim Meet 再点铃铛
Footnote: Needs iOS 16.4 or later. / 需要 iOS 16.4 或更高版本。
Button: Got it / 知道了

## System notification (drawn by the OS)

Title: the swimmer's name. Body: "{name} has a new Live result" / "{name} has a new Official
result" · "{name} 有新的现场成绩" / "{name} 有新的正式成绩". 中文 uses the Chinese name when set.
Tapping opens the swimmer's Results tab.

Icon: `public/apple-touch-icon.png`. Badge (Android status bar): `public/notification-badge.png`,
96×96, white swimmer on transparent (chosen over an "SM" monogram).
