---
name: barclays-ib-console
description: Use when building One Finance chrome or when another team must copy the One Fin UX theme for an iframed screen. Also use when a mock looks editorial, cream, serif, or unlike FoboControlTower_V2.
---

# Barclays IB console

Colleague UI matches **FOBO Control Tower V2**: navy header, cyan active, cool grey canvas, dense cards. Not a magazine.

## Tokens (light workstation)

| Token | Value |
|---|---|
| Header | `#002D5F` / deep `#001E45` |
| Accent / live / APAC | `#00AEEF` |
| Page | `#EEF2F7` |
| Card | `#FFFFFF` |
| Ink | `#0D1B2E` |
| Muted | `#4E6880` |
| Cleared | `#1A7A45` |
| Awaiting | `#A05C08` |
| Blocked | `#B02020` |
| MOTIF / auto | `#4E3C9A` |

Font: Manrope or IBM Plex Sans. Mono for rec ids, times, money.

## Chrome

Header: product name · COB date · region · env · entitled role. Gold/cyan 2–3px rule under navy is acceptable; no serif H1s, no cream paper, no Newsreader.

Cards: 1px `#002D5F` at 12% opacity, left rail for status. Book bars use `--bar-auto`, `--bar-cleared`, `--bar-awaiting`, `--bar-blocked`, `--bar-notopen`.

## Other teams

Ship `experience/theme/onefinux-tokens.css` as `/theme/onefinux-tokens.css`. Partners import it and use `--ofx-*` only. Iframed body sets `data-ofx-embedded="1"` and **omits** a second header. **REQUIRED:** `embed-partner-screen` for the host contract.

## Common mistakes

- Using the Dreamliner cream/serif screens as visual truth — **V2 HTML is truth**
- Hard-coding “FOBO Control Tower” as the platform title — title is the **current product**
- Recharts as the break viewer — Wijmo (`wijmo-outcome-grid`)
