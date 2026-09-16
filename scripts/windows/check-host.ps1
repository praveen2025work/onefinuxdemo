<#
.SYNOPSIS
  Verify a Windows local or hosted demo: jars, dist, NSSM, IIS, and live ports.
#>
[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [int]$HubPort = 7070,
    [int]$SimPort = 7081,
    [int]$SitePort = 8080
)

$ErrorActionPreference = 'Continue'
$failed = 0

function Write-Check {
    param([bool]$Ok, [string]$Message)
    if ($Ok) {
        Write-Host "  OK    $Message"
    } else {
        Write-Host "  FAIL  $Message"
        $script:failed++
    }
}

Write-Host 'One Finance Windows host check'
Write-Host "Repo: $RepoRoot"

$hubJar = Join-Path $RepoRoot 'onefinux-hub\target\onefinux-hub-0.1.0-SNAPSHOT.jar'
$simJar = Join-Path $RepoRoot 'source-simulator\target\source-simulator-0.1.0-SNAPSHOT.jar'
$dist = Join-Path $RepoRoot 'frontend\web\dist'
$webConfig = Join-Path $dist 'web.config'

Write-Check (Test-Path -LiteralPath $hubJar) "Hub jar  $hubJar"
Write-Check (Test-Path -LiteralPath $simJar) "Simulator jar  $simJar"
Write-Check (Test-Path -LiteralPath (Join-Path $dist 'index.html')) "IIS site root  $dist\index.html"
Write-Check (Test-Path -LiteralPath $webConfig) "IIS web.config copied into dist"

if (Test-Path -LiteralPath $webConfig) {
    $xml = Get-Content -LiteralPath $webConfig -Raw
    Write-Check ($xml -match 'No Managed Code') 'web.config documents No Managed Code'
    Write-Check ($xml -match '127\.0\.0\.1:7070') 'web.config proxies /api to 127.0.0.1:7070'
    Write-Check ($xml -match '127\.0\.0\.1:7081') 'web.config proxies /sim to 127.0.0.1:7081'
    Write-Check ($xml -match 'index\.html') 'web.config SPA fallback to index.html'
}

$hubSvc = Get-Service -Name OneFinUxHub -ErrorAction SilentlyContinue
$simSvc = Get-Service -Name OneFinUxSimulator -ErrorAction SilentlyContinue
if ($hubSvc) {
    Write-Check ($hubSvc.Status -eq 'Running') "NSSM OneFinUxHub is $($hubSvc.Status)"
} else {
    Write-Host '  SKIP  NSSM OneFinUxHub is not installed (local Vite path uses run.cmd instead)'
}
if ($simSvc) {
    Write-Check ($simSvc.Status -eq 'Running') "NSSM OneFinUxSimulator is $($simSvc.Status)"
} else {
    Write-Host '  SKIP  NSSM OneFinUxSimulator is not installed (local Vite path uses run.cmd instead)'
}

function Test-Url {
    param([string]$Url)
    try {
        $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400)
    } catch {
        return $false
    }
}

Write-Check (Test-Url "http://localhost:$HubPort/api/outcomes") "Hub REST  http://localhost:$HubPort/api/outcomes"
Write-Check (Test-Url "http://localhost:$SimPort/actuator/health") "Simulator  http://localhost:$SimPort/actuator/health"

$site = $null
try {
    Import-Module WebAdministration -ErrorAction Stop
    $site = Get-Website -Name OneFinUxConsole -ErrorAction SilentlyContinue
} catch {
    Write-Host '  SKIP  IIS administration module not loaded'
}

if ($site) {
    $pool = Get-Item "IIS:\AppPools\OneFinUxConsole" -ErrorAction SilentlyContinue
    $clr = if ($pool) { [string]$pool.managedRuntimeVersion } else { '?' }
    Write-Check ($clr -eq '') "IIS app pool OneFinUxConsole CLR is No Managed Code (value='$clr')"
    Write-Check (Test-Url "http://localhost:$SitePort/") "IIS console  http://localhost:$SitePort/"
    Write-Check (Test-Url "http://localhost:$SitePort/api/outcomes") "IIS same-origin /api  http://localhost:$SitePort/api/outcomes"
} else {
    Write-Host '  SKIP  IIS site OneFinUxConsole is not installed (use Vite on 5173 for local)'
}

Write-Host ''
if ($failed -gt 0) {
    Write-Host "Failed checks: $failed"
    exit 1
}
Write-Host 'All executed checks passed.'
exit 0
