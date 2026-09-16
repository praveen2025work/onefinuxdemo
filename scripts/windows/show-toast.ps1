#Requires -Version 5.1
<#
.SYNOPSIS
  Show a Windows Action Center toast (same corner as Outlook new-mail).

.DESCRIPTION
  Used by the hub WindowsToastChannel. Also runnable by hand to prove the
  desktop popup works on this machine:

    powershell -ExecutionPolicy Bypass -File scripts\windows\show-toast.ps1 `
      -Title "FOBO is READY" -Message "Helix can run"

  If this process is Session 0 (NSSM Local System), the toast is re-launched
  as an interactive scheduled task so it reaches the logged-on user's desktop.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Message,
    [string]$Severity = 'INFO',
    [string]$Payload
)

$ErrorActionPreference = 'Stop'
$AppId = 'OneFinance.Hub'

if ($Payload -and (Test-Path -LiteralPath $Payload)) {
    $data = Get-Content -LiteralPath $Payload -Raw | ConvertFrom-Json
    $Title = [string]$data.Title
    $Message = [string]$data.Message
    $Severity = [string]$data.Severity
    Remove-Item -LiteralPath $Payload -Force -ErrorAction SilentlyContinue
}

function Protect-Xml([string]$Text) {
    if ($null -eq $Text) { return '' }
    return (($Text -replace '&', '&amp;') -replace '<', '&lt;' -replace '>', '&gt;' -replace '"', '&quot;')
}

function Register-OneFinanceAppId {
    $programs = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
    New-Item -ItemType Directory -Force -Path $programs | Out-Null
    $lnk = Join-Path $programs 'One Finance.lnk'
    if (Test-Path -LiteralPath $lnk) { return }
    $shell = New-Object -ComObject WScript.Shell
    $sc = $shell.CreateShortcut($lnk)
    $sc.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $sc.Arguments = '-NoProfile -WindowStyle Hidden'
    $sc.Description = 'One Finance outcome hub'
    $sc.Save()
}

function Show-WinRtToast {
    param([string]$ToastTitle, [string]$ToastBody, [string]$Level)
    Register-OneFinanceAppId
    $null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $null = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]
    $xml = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>One Finance</text>
      <text>$(Protect-Xml $ToastTitle)</text>
      <text>$(Protect-Xml $ToastBody)</text>
    </binding>
  </visual>
</toast>
"@
    $doc = [Windows.Data.Xml.Dom.XmlDocument]::new()
    $doc.LoadXml($xml)
    $toast = [Windows.UI.Notifications.ToastNotification]::new($doc)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppId).Show($toast) | Out-Null
}

function Show-BalloonFallback {
    param([string]$ToastTitle, [string]$ToastBody)
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    Add-Type -AssemblyName System.Drawing | Out-Null
    $icon = New-Object System.Windows.Forms.NotifyIcon
    $icon.Icon = [System.Drawing.SystemIcons]::Information
    $icon.Visible = $true
    $tip = switch ($Severity) {
        'CRITICAL' { [System.Windows.Forms.ToolTipIcon]::Error }
        'WARN' { [System.Windows.Forms.ToolTipIcon]::Warning }
        default { [System.Windows.Forms.ToolTipIcon]::Info }
    }
    $icon.ShowBalloonTip(8000, $ToastTitle, $ToastBody, $tip)
    Start-Sleep -Seconds 9
    $icon.Dispose()
}

$sessionId = [System.Diagnostics.Process]::GetCurrentProcess().SessionId
if ($sessionId -eq 0 -and -not $Payload) {
    $tmp = Join-Path $env:TEMP ("ofx-toast-" + [guid]::NewGuid().ToString() + ".json")
    @{ Title = $Title; Message = $Message; Severity = $Severity } | ConvertTo-Json | Set-Content -LiteralPath $tmp -Encoding UTF8
    $ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $tr = "`"$ps`" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`" -Payload `"$tmp`""
    $task = 'OneFinUxToast'
    schtasks.exe /Create /TN $task /TR $tr /SC ONCE /ST 00:00 /F /IT /RL LIMITED | Out-Null
    schtasks.exe /Run /TN $task | Out-Null
    exit 0
}

try {
    Show-WinRtToast -ToastTitle $Title -ToastBody $Message -Level $Severity
} catch {
    Show-BalloonFallback -ToastTitle $Title -ToastBody $Message
}
