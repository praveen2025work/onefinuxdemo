@echo off
REM Print this PC's WiFi / Ethernet IPv4 URLs for the One Finance console (port 7091).
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notmatch '^127\.' };" ^
  "if (-not $ips) { Write-Host '  (no IPv4 found — run ipconfig)' ; exit 0 };" ^
  "$ips | ForEach-Object { Write-Host ('  http://{0}:7091' -f $_.IPAddress) }"
