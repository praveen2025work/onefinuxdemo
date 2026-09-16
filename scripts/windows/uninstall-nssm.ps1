#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Stop and remove the One Finance NSSM services.
#>
[CmdletBinding()]
param(
    [string]$Nssm = 'nssm'
)

$ErrorActionPreference = 'Stop'

function Resolve-Nssm {
    param([string]$NssmCmd)
    $cmd = Get-Command $NssmCmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    if (Test-Path -LiteralPath $NssmCmd) { return (Resolve-Path $NssmCmd).Path }
    throw 'nssm.exe is not on PATH. Pass -Nssm C:\path\to\nssm.exe'
}

$nssmExe = Resolve-Nssm -NssmCmd $Nssm

foreach ($name in @('OneFinUxHub', 'OneFinUxSimulator')) {
    $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
    if (-not $svc) {
        Write-Host "Service $name is not installed."
        continue
    }
    if ($svc.Status -ne 'Stopped') {
        & $nssmExe stop $name
    }
    & $nssmExe remove $name confirm
    Write-Host "Removed $name."
}
