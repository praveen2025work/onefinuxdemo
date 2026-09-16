#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Install the One Finance Java processes as NSSM Windows services.

.DESCRIPTION
  Creates / updates two services that keep the hub and simulator running for a
  Windows demo host (IIS serves the React dist; these services are the API):

    OneFinUxHub        java -jar onefinux-hub\target\...          :7070
    OneFinUxSimulator  java -jar source-simulator\target\...      :7081

  AppDirectory is the repository root so the H2 file stays at .\data\onefinux-hub
  and logs land in .\logs\. Hub callbacks stay on localhost:7070 (not the IIS port).

.PARAMETER RepoRoot
  Repository root. Defaults to two levels above this script.

.PARAMETER Nssm
  nssm.exe path or command name. Must be on PATH unless you pass a full path.

.PARAMETER HubPort
  Hub listen port. Default 7070.

.PARAMETER SimPort
  Simulator listen port. Default 7081.

.PARAMETER Java
  java.exe path. Defaults to JAVA_HOME\bin\java.exe, then PATH.
#>
[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$Nssm = 'nssm',
    [int]$HubPort = 7070,
    [int]$SimPort = 7081,
    [string]$Java = ''
)

$ErrorActionPreference = 'Stop'

function Resolve-Java {
    param([string]$Hint)
    if ($Hint -and (Test-Path -LiteralPath $Hint)) { return (Resolve-Path $Hint).Path }
    if ($env:JAVA_HOME) {
        $fromHome = Join-Path $env:JAVA_HOME 'bin\java.exe'
        if (Test-Path -LiteralPath $fromHome) { return (Resolve-Path $fromHome).Path }
    }
    $cmd = Get-Command java -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw 'Java 21 is required. Install a JDK and set JAVA_HOME, or pass -Java.'
}

function Get-JavaMajor {
    param([string]$JavaExe)
    $out = & $JavaExe -version 2>&1 | Out-String
    if ($out -match 'version "(\d+)') { return [int]$Matches[1] }
    throw "Could not read a version from $JavaExe"
}

function Assert-Nssm {
    param([string]$NssmCmd)
    $cmd = Get-Command $NssmCmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    if (Test-Path -LiteralPath $NssmCmd) { return (Resolve-Path $NssmCmd).Path }
    throw @'
NSSM is not on PATH. Download nssm from https://nssm.cc/download, add nssm.exe
to PATH, or rerun with -Nssm C:\path\to\nssm.exe
'@
}

function Set-NssmService {
    param(
        [string]$NssmExe,
        [string]$Name,
        [string]$DisplayName,
        [string]$Description,
        [string]$JavaExe,
        [string]$AppParameters,
        [string]$AppDirectory,
        [string]$Stdout,
        [string]$Stderr
    )

    $existing = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if (-not $existing) {
        & $NssmExe install $Name $JavaExe | Out-Null
    }

    & $NssmExe set $Name Application $JavaExe | Out-Null
    & $NssmExe set $Name AppParameters $AppParameters | Out-Null
    & $NssmExe set $Name AppDirectory $AppDirectory | Out-Null
    & $NssmExe set $Name DisplayName $DisplayName | Out-Null
    & $NssmExe set $Name Description $Description | Out-Null
    & $NssmExe set $Name Start SERVICE_AUTO_START | Out-Null
    & $NssmExe set $Name AppStdout $Stdout | Out-Null
    & $NssmExe set $Name AppStderr $Stderr | Out-Null
    & $NssmExe set $Name AppRotateFiles 1 | Out-Null
    & $NssmExe set $Name AppRotateBytes 10485760 | Out-Null
    & $NssmExe set $Name AppExit Default Restart | Out-Null
    & $NssmExe set $Name AppRestartDelay 2000 | Out-Null
}

$javaExe = Resolve-Java -Hint $Java
$major = Get-JavaMajor -JavaExe $javaExe
if ($major -lt 21) {
    throw "Java 21 or newer is required. $javaExe reports major $major."
}

$nssmExe = Assert-Nssm -NssmCmd $Nssm
$hubJar = Join-Path $RepoRoot 'onefinux-hub\target\onefinux-hub-0.1.0-SNAPSHOT.jar'
$simJar = Join-Path $RepoRoot 'source-simulator\target\source-simulator-0.1.0-SNAPSHOT.jar'
if (-not (Test-Path -LiteralPath $hubJar) -or -not (Test-Path -LiteralPath $simJar)) {
    throw "Jars are missing. Run scripts\windows\build-demo.cmd first.`n  $hubJar`n  $simJar"
}

$logs = Join-Path $RepoRoot 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot 'data') | Out-Null

$hubParams = "-Dserver.port=$HubPort -Donefinux.public-url=http://localhost:$HubPort -Donefinux.simulator-url=http://localhost:$SimPort -jar `"$hubJar`""
$simParams = "-Dserver.port=$SimPort -Dsim.hub-url=http://localhost:$HubPort -Dsim.allowed-origin=http://localhost:$HubPort -jar `"$simJar`""

Set-NssmService -NssmExe $nssmExe -Name 'OneFinUxHub' `
    -DisplayName 'One Finance Hub' `
    -Description 'One Finance outcome hub (REST + SSE). Working directory is the repo root for H2 ./data/onefinux-hub.' `
    -JavaExe $javaExe -AppParameters $hubParams -AppDirectory $RepoRoot `
    -Stdout (Join-Path $logs 'nssm-hub.out.log') `
    -Stderr (Join-Path $logs 'nssm-hub.err.log')

Set-NssmService -NssmExe $nssmExe -Name 'OneFinUxSimulator' `
    -DisplayName 'One Finance Source Simulator' `
    -Description 'One Finance Motif/SAP/Helix/Axiom stand-in used by Drive scenarios.' `
    -JavaExe $javaExe -AppParameters $simParams -AppDirectory $RepoRoot `
    -Stdout (Join-Path $logs 'nssm-sim.out.log') `
    -Stderr (Join-Path $logs 'nssm-sim.err.log')

Restart-Service -Name OneFinUxHub -Force
Restart-Service -Name OneFinUxSimulator -Force

Write-Host "NSSM services are installed and started."
Write-Host "  OneFinUxHub        http://localhost:$HubPort/api/outcomes"
Write-Host "  OneFinUxSimulator  http://localhost:$SimPort/sim/scenarios"
Write-Host "AppDirectory (H2 + logs): $RepoRoot"
Write-Host "Desktop toasts: scripts\windows\show-toast.ps1 hops to the logged-on session (stay signed in)."
Write-Host "Next: powershell -ExecutionPolicy Bypass -File scripts\windows\install-iis-site.ps1"
