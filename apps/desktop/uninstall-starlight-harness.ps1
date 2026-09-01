param(
  [string] $Target
)

$ErrorActionPreference = 'Stop'
$appKey = 'HKCU:\Software\793ea7d7-493b-56f6-89d2-a7626c6179ca'
$uninstallKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\793ea7d7-493b-56f6-89d2-a7626c6179ca'

if ([string]::IsNullOrWhiteSpace($Target)) {
  $Target = (Get-ItemProperty -Path $appKey -Name InstallLocation -ErrorAction SilentlyContinue).InstallLocation
}
if ([string]::IsNullOrWhiteSpace($Target)) {
  $Target = Join-Path $env:LOCALAPPDATA 'Programs\starlight-ai'
}

Write-Host "Target: $Target"
Get-Process -Name 'starlight-ai' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

if (Test-Path -LiteralPath $Target) {
  Remove-Item -LiteralPath $Target -Recurse -Force
}

$paths = @(
  (Join-Path $env:APPDATA 'Starlight AI助手'),
  (Join-Path $env:LOCALAPPDATA 'Starlight AI助手'),
  (Join-Path $env:USERPROFILE '.dsh\profiles\web'),
  (Join-Path $env:USERPROFILE 'Desktop\Starlight AI助手.lnk'),
  (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Starlight AI助手')
)

foreach ($path in $paths) {
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Recurse -Force
  }
}

Remove-Item -Path $appKey, $uninstallKey -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'Uninstall complete.'
