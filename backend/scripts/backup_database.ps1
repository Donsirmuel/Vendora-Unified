<#
.SYNOPSIS
  Creates a timestamped logical backup (pg_dump custom format) of the configured Postgres database.

.DESCRIPTION
  Uses the DATABASE_URL environment variable (same format used by Django) to parse connection info.
  Falls back to error if DATABASE_URL not set.

.PARAMETER RETENTION
  Optional: number of most recent backups to retain (older ones deleted). Default = 7.

.EXAMPLES
  powershell.exe -ExecutionPolicy Bypass -File .\scripts\backup_database.ps1
  powershell.exe -File .\scripts\backup_database.ps1 -Retention 10

.NOTES
  Requires pg_dump available in PATH. (Install PostgreSQL client tools.)
#>
param(
    [int]$Retention = 7
)

$ErrorActionPreference = 'Stop'

function Parse-DatabaseUrl($url) {
    if (-not $url) { throw 'DATABASE_URL is empty.' }
    # Expected: postgres://user:pass@host:port/dbname?param=...  (password may contain special chars)
    if ($url -notmatch '^(?<scheme>[^:]+)://') { throw 'Unsupported or invalid URL scheme.' }

    $uri = [System.Uri]::new($url)
    if ($uri.Scheme -notin @('postgres','postgresql')) { throw 'Only postgres:// URLs supported.' }

    $userInfo = $uri.UserInfo
    $username = $userInfo
    $password = ''
    if ($userInfo -match ':') {
        $username = $userInfo.Split(':')[0]
        $password = $userInfo.Substring($username.Length + 1)
    }

    $dbName = $uri.AbsolutePath.Trim('/')
    if (-not $dbName) { throw 'Database name missing in URL.' }

    return [pscustomobject]@{
        Host = $uri.Host
        Port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
        User = $username
        Password = $password
        Database = $dbName
        Query = $uri.Query.TrimStart('?')
    }
}

function Ensure-Tool($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Required tool '$name' not found in PATH. Install PostgreSQL client tools (psql/pg_dump)."
    }
}

Write-Host '[backup] Starting database backup...'

$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl) { throw 'DATABASE_URL environment variable not set.' }

Ensure-Tool 'pg_dump'

$conn = Parse-DatabaseUrl $databaseUrl

# Prepare output directory
$backupDir = Join-Path $PSScriptRoot '..' 'backups'
$backupDir = (Resolve-Path $backupDir -ErrorAction SilentlyContinue) ?? (New-Item -ItemType Directory -Path $backupDir).FullName

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$fileName = "db_${timestamp}.dump"
$outFile = Join-Path $backupDir $fileName

# Build pg_dump args
# Use custom format (-F c) for flexibility (pg_restore allows selective restore)
$env:PGPASSWORD = $conn.Password
$pgArgs = @(
    '-h', $conn.Host,
    '-p', $conn.Port,
    '-U', $conn.User,
    '-F', 'c',
    '--no-owner',
    '--no-privileges',
    $conn.Database,
    '-f', $outFile
)

Write-Host "[backup] Running: pg_dump $($pgArgs -join ' ')" -ForegroundColor Cyan

$start = Get-Date
$dump = & pg_dump @pgArgs 2>&1
$exit = $LASTEXITCODE
$duration = (Get-Date) - $start
if ($exit -ne 0) {
    Write-Error "Backup failed (exit $exit). Output:\n$dump"
    exit $exit
}

Write-Host "[backup] Completed in $([int]$duration.TotalSeconds)s -> $outFile" -ForegroundColor Green

# Retention cleanup
if ($Retention -gt 0) {
    $files = Get-ChildItem -Path $backupDir -Filter 'db_*.dump' | Sort-Object LastWriteTime -Descending
    if ($files.Count -gt $Retention) {
        $remove = $files[$Retention..($files.Count-1)]
        foreach ($f in $remove) {
            Write-Host "[backup] Removing old backup: $($f.Name)" -ForegroundColor DarkYellow
            Remove-Item $f.FullName -Force
        }
    }
}

Write-Host '[backup] Done.'
