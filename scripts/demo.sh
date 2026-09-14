#!/usr/bin/env bash
# Scripted walkthrough for a stakeholder demo. Hub APIs on 7070; watch the console on 5173.
set -euo pipefail
HUB=${HUB:-http://localhost:7070}; SIM=${SIM:-http://localhost:7081}
pause() { echo; read -r -p ">> $1  [Enter]" _; }

curl -s -XPOST $HUB/api/admin/reset > /dev/null
echo "Board reset. Three questions are on screen, all answering 'Not yet'."

pause "Act 1 - FOBO/Helix: 300 master books arrive; at 100% the hub triggers Helix itself"
curl -s -XPOST "$SIM/sim/scenarios/helix?seconds=40"; echo

pause "Act 2 - 15C3 with a US Castle batch failure (watch it go Blocked, then recover)"
curl -s -XPOST "$SIM/sim/scenarios/15c3?failure=true"; echo

pause "Act 3 - PnL: slow sources, the hub warns before the deadline and then records the breach"
curl -s -XPOST "$SIM/sim/scenarios/pnl"; echo

pause "Act 4 - (after 15C3 shows Done) SAP restates a trial balance; readiness is withdrawn and the report re-runs"
curl -s -XPOST "$SIM/sim/scenarios/restate"; echo

pause "Act 5 - Controller overrides the late RAM input on PnL (reason is audited)"
curl -s -XPOST "$HUB/api/outcomes/PNL_REPORTING/$(date +%F)/AMRS/override" \
  -H 'Content-Type: application/json' \
  -d '{"dependency":"RAM_CHORUS_READY","reason":"Confirmed with RAM support, INC0042","requestedBy":"demo.controller"}' \
  | head -c 300; echo
echo; echo "Done. Notifications: $HUB/api/notifications"
