# Scripted stakeholder demo for Windows PowerShell.
# Watch the console at http://localhost:5173 (Board / Reports). Port 7070 is the API only.
# Start first: scripts\run.cmd   then   cd frontend\web; npm run dev
$HubPort = if ($env:HUB_PORT) { $env:HUB_PORT } else { 7070 }
$SimPort = if ($env:SIM_PORT) { $env:SIM_PORT } else { 7081 }
$Hub = "http://localhost:$HubPort"; $Sim = "http://localhost:$SimPort"; $Cob = Get-Date -Format "yyyy-MM-dd"
function Pause-Step($text) { Read-Host "`n>> $text  [Enter]" | Out-Null }

Invoke-RestMethod -Method Post "$Hub/api/admin/reset" | Out-Null
Write-Host "Reset done. Watch http://localhost:5173 (Board / Reports) — not port 7070."

Pause-Step "Act 1 - FOBO/Helix: 300 master books arrive; at 100% the hub triggers Helix itself"
Invoke-RestMethod -Method Post "$Sim/sim/scenarios/helix?seconds=40"

Pause-Step "Act 2 - 15C3 with a US Castle batch failure (watch it go Blocked, then recover)"
Invoke-RestMethod -Method Post "$Sim/sim/scenarios/15c3?failure=true"

Pause-Step "Act 3 - PnL: slow sources, early warning, then a recorded SLA breach"
Invoke-RestMethod -Method Post "$Sim/sim/scenarios/pnl"

Pause-Step "Act 4 - (after 15C3 shows Done) SAP restates a trial balance; the report re-runs"
Invoke-RestMethod -Method Post "$Sim/sim/scenarios/restate"

Pause-Step "Act 5 - Controller overrides the late RAMP input on PnL (reason is audited)"
$body = @{ dependency = "RAMP_CHORUS_READY"; reason = "Confirmed with RAMP support, INC0042"; requestedBy = "demo.controller" } | ConvertTo-Json
Invoke-RestMethod -Method Post "$Hub/api/outcomes/PNL_REPORTING/$Cob/AMRS/override" -ContentType "application/json" -Body $body
Write-Host "`nDone. Notifications: $Hub/api/notifications"
