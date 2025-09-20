# PowerShell cleanup report generator for Vendora-Unified
$root = (Get-Location).Path
$report = Join-Path $root 'deployment' 'cleanup-report.txt'
if (Test-Path $report) { Remove-Item $report -Force }

Add-Content $report '=== Large files (>1MB) ==='
Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 1MB } | Sort-Object Length -Descending | ForEach-Object { Add-Content $report ("$($_.Length)  $($_.FullName)") }

Add-Content $report ""
Add-Content $report '=== .env backups and related ==='
Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '.env*' -and $_.Name -ne '.env.example' -and $_.FullName -notlike '*\\backend\\.env.example' } | ForEach-Object { Add-Content $report $_.FullName }

Add-Content $report ""
Add-Content $report '=== __pycache__ and .pyc ==='
Get-ChildItem -Path $root -Recurse -Directory -Filter '__pycache__' -ErrorAction SilentlyContinue | ForEach-Object { Add-Content $report $_.FullName }
Get-ChildItem -Path $root -Recurse -File -Filter '*.pyc' -ErrorAction SilentlyContinue | ForEach-Object { Add-Content $report $_.FullName }

Add-Content $report ""
Add-Content $report '=== backend/scripts listing ==='
$scriptsDir = Join-Path $root 'backend' 'scripts'
if (Test-Path $scriptsDir) { Get-ChildItem -Path $scriptsDir -File -ErrorAction SilentlyContinue | ForEach-Object { Add-Content $report $_.FullName } } else { Add-Content $report '(no backend/scripts directory found)' }

Add-Content $report ""
Add-Content $report '=== Top-level large directories (sizes) ==='
Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | ForEach-Object { $size = (Get-ChildItem -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Add-Content $report ("$($size) bytes  $($_.FullName)") }

Add-Content $report ""
Add-Content $report "Report generated on: $(Get-Date -Format 'u')"
Write-Output "Report written to $report"