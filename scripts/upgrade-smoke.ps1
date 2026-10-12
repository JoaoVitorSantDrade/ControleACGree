$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskTarget = [IO.Path]::GetFullPath((Join-Path $taskRoot '.cache\install-upgrade'))
if (-not $taskTarget.StartsWith((Join-Path $taskRoot '.cache\'), [StringComparison]::OrdinalIgnoreCase)) { throw 'QA installation must remain inside the workspace cache.' }
$taskProfile = Join-Path $taskRoot '.cache\upgrade-qa'
$taskBackup = Join-Path $taskProfile 'shortcuts'
New-Item -ItemType Directory -Force -Path $taskBackup | Out-Null
# The builder uses path-based process detection only when this PowerShell check succeeds.
$taskWindowsPS = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
& $taskWindowsPS -NoProfile -Command "if ((Get-ExecutionPolicy -Scope Process) -eq 'Restricted' -or !(Get-Command Get-CimInstance -ErrorAction SilentlyContinue)) { exit 1 }"
if ($LASTEXITCODE -ne 0) { throw 'Installer could fall back to stopping processes by name. QA refused.' }
$taskExisting = @(Get-Process | Where-Object { $_.ProcessName -eq 'Gree Desktop' -and $_.Path -and -not $_.Path.StartsWith($taskTarget, [StringComparison]::OrdinalIgnoreCase) } | Select-Object -ExpandProperty Id)
if ($taskExisting.Count -gt 0) { throw 'Encerre o Gree Desktop antes de executar este ensaio de instaladores. O teste com aplicativo ativo foi rejeitado pela revisao automatica.' }
$taskShortcuts = @((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Gree Desktop.lnk'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Gree Desktop.lnk'))
$taskSaved = @()
foreach ($taskLink in $taskShortcuts) { if (Test-Path -LiteralPath $taskLink) { $taskCopy = Join-Path $taskBackup ($taskSaved.Count.ToString() + '.lnk'); Copy-Item -LiteralPath $taskLink -Destination $taskCopy; $taskSaved += @{ Path=$taskLink; Backup=$taskCopy } } }
try {
  $taskFirst = Start-Process -FilePath (Join-Path $taskRoot 'release\Gree Desktop Setup 0.1.0.exe') -ArgumentList @('/S','/NODESKTOPSHORTCUT',"/D=$taskTarget") -WindowStyle Hidden -Wait -PassThru
  if ($taskFirst.ExitCode -ne 0) { throw "0.1 installer failed: $($taskFirst.ExitCode)" }
  $taskExecutable = Join-Path $taskTarget 'Gree Desktop.exe'
  if ((Get-Item -LiteralPath $taskExecutable).VersionInfo.FileVersion -ne '0.1.0') { throw '0.1 was not installed in the isolated target.' }
  & node (Join-Path $taskRoot 'scripts\packaged-smoke.mjs') $taskExecutable $taskProfile seed
  if ($LASTEXITCODE -ne 0) { throw '0.1 QA seed failed.' }
  Copy-Item -LiteralPath (Join-Path $taskProfile 'report.json') -Destination (Join-Path $taskProfile 'report-0.1.json')
  $taskSecond = Start-Process -FilePath (Join-Path $taskRoot 'release\Gree Desktop Setup 0.2.0.exe') -ArgumentList @('/S','/NODESKTOPSHORTCUT',"/D=$taskTarget") -WindowStyle Hidden -Wait -PassThru
  if ($taskSecond.ExitCode -ne 0) { throw "0.2 installer failed: $($taskSecond.ExitCode)" }
  if ((Get-Item -LiteralPath $taskExecutable).VersionInfo.FileVersion -ne '0.2.0') { throw '0.2 was not installed in the same target.' }
  & node (Join-Path $taskRoot 'scripts\packaged-smoke.mjs') $taskExecutable $taskProfile verify
  if ($LASTEXITCODE -ne 0) { throw '0.2 data preservation failed.' }
  foreach ($taskPid in $taskExisting) { if (-not (Get-Process -Id $taskPid -ErrorAction SilentlyContinue)) { throw "Existing application process was interrupted: $taskPid" } }
  @{ installer010=$taskFirst.ExitCode; installer020=$taskSecond.ExitCode; dataPreserved=$true; realProcessesPreserved=$true; target=$taskTarget } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskProfile 'upgrade-report.json') -Encoding utf8
} finally {
  $taskUninstaller = Join-Path $taskTarget 'Uninstall Gree Desktop.exe'
  if (Test-Path -LiteralPath $taskUninstaller) { Start-Process -FilePath $taskUninstaller -ArgumentList '/S' -WindowStyle Hidden -Wait }
  foreach ($taskEntry in $taskSaved) { Copy-Item -LiteralPath $taskEntry.Backup -Destination $taskEntry.Path -Force }
}
