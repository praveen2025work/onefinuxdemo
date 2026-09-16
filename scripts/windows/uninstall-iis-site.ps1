#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Remove the One Finance IIS site and app pool. Does not uninstall IIS or ARR.
#>
[CmdletBinding()]
param(
    [string]$SiteName = 'OneFinUxConsole',
    [string]$AppPoolName = 'OneFinUxConsole'
)

$ErrorActionPreference = 'Stop'
Import-Module WebAdministration

$site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if ($site) {
    Stop-Website -Name $SiteName -ErrorAction SilentlyContinue
    Remove-Website -Name $SiteName
    Write-Host "Removed site $SiteName."
} else {
    Write-Host "Site $SiteName is not installed."
}

if (Test-Path "IIS:\AppPools\$AppPoolName") {
    Stop-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
    Remove-WebAppPool -Name $AppPoolName
    Write-Host "Removed app pool $AppPoolName."
} else {
    Write-Host "App pool $AppPoolName is not installed."
}
