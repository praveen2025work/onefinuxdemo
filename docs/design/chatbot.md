# Chatbot in One Finance

A chatbot your team runs is framed inside One Finance: as a tab in the assistant panel (spark icon) and as the
**Chat** desk widget. It looks like the console because it uses the same styling, and it talks to the console through a
small postMessage contract. The console's own assistant uses the same chat styling, so both read alike.

## 1. Point the hub at the bot

| Setting | Meaning |
|---|---|
| `ONEFINUX_CHATBOT_URL` | The bot's page, e.g. `https://chat.bank.local/onefinance` (default: the demo bot, `/chatbot-demo.html`) |
| `ONEFINUX_CHATBOT_ORIGIN` | The bot's origin, e.g. `https://chat.bank.local`; the console accepts messages only from it |
| `ONEFINUX_CHATBOT_TITLE` | Tab and widget title (default `Chat (demo)`) |

The console's Content-Security-Policy already allows framing `https:` pages. The bot's server must allow the console to
frame it: `Content-Security-Policy: frame-ancestors https://<console origin>` (not `X-Frame-Options: DENY`).

## 2. Style the bot like the console

Link the console's tokens and use the `.ofx-chat` classes:

```html
<html data-skin="steps" data-theme="light">
<link rel="stylesheet" href="https://<console origin>/theme/onefinux-tokens.css">
<div class="ofx-chat">
  <div class="ofx-chat-list">
    <div class="ofx-chat-msg ofx-chat-user">Why is R-2031 blocked?</div>
    <div class="ofx-chat-msg ofx-chat-bot">Blocked on Motif MB014.
      <div class="ofx-chat-actions"><button class="ofx-chat-action">Open R-2031</button></div></div>
  </div>
  <form class="ofx-chat-compose"><input class="ofx-chat-input"><button class="ofx-btn">Send</button></form>
</div>
```

The URL the console opens carries `?ofx-embed=1&theme=light|dark&skin=steps|ofx&groupUnit=&cobDate=&region=`. Set
`html[data-theme]` and `html[data-skin]` from them and the tokens do the rest, in light and dark.

## 3. The contract

| Direction | Message | When |
|---|---|---|
| bot → console | `{ type: 'ofx.chat.ready' }` | The bot is listening |
| console → bot | `{ type: 'ofx.theme', theme, skin }` | After ready, and on every theme change |
| console → bot | `{ type: 'ofx.context', scope: { groupUnit, cobDate, region }, page, user }` | After ready, and when the scope or screen changes |
| bot → console | `{ type: 'ofx.chat.open', route: '/instance/…' }` | Open a console screen (a same-origin path only) |
| bot → console | `{ type: 'ofx.chat.share', context: { type: 'ofx.instance', … } }` | Share a pick with linked screens (FDC3 context) |

Post to the console with `window.parent.postMessage(msg, '<console origin>')`, and accept messages only when
`event.source === window.parent` and `event.origin` is the console's origin. The console ignores anything else.
`frontend/web/public/chatbot-demo.js` is a complete example in 100 lines.

## 4. What the console does not do

It does not pass tokens or cookies to the bot (the bot signs users in itself), it does not act on any other message,
and it never follows a route that leaves the console. Opens and shares are logged as usage (`chatbot.open`,
`chatbot.share`).

## 5. MITR AI (support-bot)

MITR AI is hosted on its own and framed at `/widget`. Its components paint with their own variables (`--brand`,
`--bg-*`, `--text-*`, `--border`), so the tokens file carries a **MITR bridge**: with `<html data-ofx-vars="mitr">`
those names follow the One Finance palette in every skin and mode. The bot sets that attribute, links the tokens file
and hides its own title bar and sidebar when it sees `ofx-embed=1` and its `NEXT_PUBLIC_ONEFINUX_ORIGIN` is set
(support-bot `docs/ONEFINUX-EMBED.md`).

| Side | Setting | Example |
|---|---|---|
| One Finance hub | `ONEFINUX_CHATBOT_URL` | `https://mitr.your-company.com/widget?group=finance` |
| One Finance hub | `ONEFINUX_CHATBOT_ORIGIN` | `https://mitr.your-company.com` |
| One Finance hub | `ONEFINUX_CHATBOT_TITLE` | `MITR AI` |
| MITR AI build | `NEXT_PUBLIC_ONEFINUX_ORIGIN` | `https://onefinance.your-company.com` |
| MITR AI nginx / IIS | `location /widget` → `frame-ancestors` | the One Finance origin |

Keep both on the same parent domain so the bot's sign-in cookies stay first-party inside the frame.

MITR AI also carries a copy of both theme files (`apps/web/src/styles/ofx`, refreshed with `npm run sync:ofx-theme`), so
it looks like STEPS on its own too: the STEPS look is its default, with "MITR classic" (the indigo `ofx` skin) in its
theme menu. Its own buttons, fields, labels and Wijmo grids follow the shared control scale (REQ-ONEUX-026).
