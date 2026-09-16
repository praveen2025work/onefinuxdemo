#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Host the React console on IIS as a No Managed Code site with ARR reverse proxy.

.DESCRIPTION
  Creates app pool OneFinUxConsole with managedRuntimeVersion = '' (No Managed Code)
  and a site whose physical path is frontend\web\dist. URL Rewrite + ARR proxy
  /api to 127.0.0.1:7070 and /sim to 127.0.0.1:7081 — the same layout as Vite
  and Docker nginx. The SPA fallback lives in dist\web.config (copied from public).

  Required Windows features / modules:
    IIS-WebServerRole, IIS-StaticContent, IIS-DefaultDocument, IIS-HttpErrors
    URL Rewrite 2.1  (https://www.iis.net/downloads/microsoft/url-rewrite)
    Application Request Routing 3  (https://www.iis.net/downloads/microsoft/application-request-routing)
#>
[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$SiteName = 'OneFinUxConsole',
    [string]$AppPoolName = 'OneFinUxConsole',
    [int]$SitePort = 8080,
    [int]$HubPort = 7070,
    [int]$SimPort = 7081
)

$ErrorActionPreference = 'Stop'

$dist = Join-Path $RepoRoot 'frontend\web\dist'
$webConfig = Join-Path $dist 'web.config'
if (-not (Test-Path -LiteralPath (Join-Path $dist 'index.html'))) {
    throw "frontend\web\dist\index.html is missing. Run scripts\windows\build-demo.cmd first."
}
if (-not (Test-Path -LiteralPath $webConfig)) {
    throw "frontend\web\dist\web.config is missing. public\web.config must copy into dist on build."
}

$rewriteDll = Join-Path $env:windir 'System32\inetsrv\rewrite.dll'
if (-not (Test-Path -LiteralPath $rewriteDll)) {
    throw @'
IIS URL Rewrite is not installed. Install URL Rewrite 2.1, then Application
Request Routing 3, then rerun this script.
  https://www.iis.net/downloads/microsoft/url-rewrite
  https://www.iis.net/downloads/microsoft/application-request-routing
'@
}

Import-Module WebAdministration

# ARR reverse proxy must be enabled at the machine level. Without this, the
# http://127.0.0.1:7070 rewrite actions in web.config do not leave the box.
$proxyFilter = 'system.webServer/proxy'
try {
    Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter $proxyFilter -Name 'enabled' -Value $true
    Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter $proxyFilter -Name 'timeout' -Value '00:20:00'
    Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter $proxyFilter -Name 'preserveHostHeader' -Value $true
} catch {
    throw @"
Could not enable ARR proxy at MACHINE/WEBROOT/APPHOST. Install Application
Request Routing 3 and open IIS Manager → server → Application Request Routing
Cache → Server Proxy Settings → Enable proxy.
$($_.Exception.Message)
"@
}

# Keep SSE (/api/stream) from being buffered into one giant response.
$appcmd = Join-Path $env:windir 'System32\inetsrv\appcmd.exe'
if (Test-Path -LiteralPath $appcmd) {
    & $appcmd set config -section:system.webServer/proxy /httpVersion:"PassThrough" /commit:apphost | Out-Null
}

if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
    New-WebAppPool -Name $AppPoolName | Out-Null
}

# Empty string = "No Managed Code" in IIS Manager. The console has no ASP.NET.
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ''
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedPipelineMode -Value 'Integrated'
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name startMode -Value 'AlwaysRunning'
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.idleTimeout -Value ([TimeSpan]::FromMinutes(0))

$site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if (-not $site) {
    New-Website -Name $SiteName -Port $SitePort -PhysicalPath $dist -ApplicationPool $AppPoolName | Out-Null
} else {
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $dist
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $AppPoolName
}

Start-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
Start-Website -Name $SiteName -ErrorAction SilentlyContinue

Write-Host "IIS site is ready (No Managed Code)."
Write-Host "  Site:     $SiteName"
Write-Host "  App pool: $AppPoolName  CLR = No Managed Code"
Write-Host "  Root:     $dist"
Write-Host "  Console:  http://localhost:$SitePort"
Write-Host "  /api  ->  127.0.0.1:$HubPort"
Write-Host "  /sim  ->  127.0.0.1:$SimPort"
Write-Host "Confirm the NSSM services are running, then Drive from http://localhost:$SitePort/drive"
Write-Host "Check: powershell -ExecutionPolicy Bypass -File scripts\windows\check-host.ps1"
