param(
  [string]$ProjectRoot = "C:\grookai_vault"
)

$ErrorActionPreference = 'Continue'
Set-Location $ProjectRoot

function New-DirIfMissing($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

$Reports = Join-Path $ProjectRoot '.reports'
New-DirIfMissing $Reports
$ReportPath = Join-Path $Reports 'codex_link_report.txt'

$envFiles = Get-ChildItem -Path $ProjectRoot -Recurse -File -Include '.env','*.env','*.env.*' -ErrorAction SilentlyContinue

$supabaseUrl = $null
$anonKey = $null
foreach ($f in $envFiles) {
  try {
    $txt = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $supabaseUrl) {
      $m = [regex]::Match($txt, '(?im)^\s*SUPABASE_URL\s*=\s*([^\r\n\s#]+)')
      if ($m.Success) { $supabaseUrl = $m.Groups[1].Value.Trim() }
    }
    if (-not $anonKey) {
      $n = [regex]::Match($txt, '(?im)^\s*SUPABASE_ANON_KEY\s*=\s*([^\r\n\s#]+)')
      if ($n.Success) { $anonKey = $n.Groups[1].Value.Trim() }
    }
  } catch {}
}

$appRef = $null
if ($supabaseUrl) {
  $m2 = [regex]::Match($supabaseUrl, '(?i)https?://([a-z0-9-]+)\.supabase\.co')
  if ($m2.Success) { $appRef = $m2.Groups[1].Value }
}

# 2) Current link status
$linkStatus = ''
try { $linkStatus = supabase link status 2>&1 | Out-String } catch { $linkStatus = $_ | Out-String }

$linkedRef = $null
try {
  # Try a few patterns to find a reference id in the status output
  $patterns = @(
    '(?im)project\s*ref\s*[:=]\s*([a-z0-9-]{6,})',
    '(?im)reference\s*id\s*[:=]\s*([a-z0-9-]{6,})',
    '(?im)ref\s*[:=]\s*([a-z0-9-]{6,})'
  )
  foreach ($p in $patterns) {
    $m = [regex]::Match($linkStatus, $p)
    if ($m.Success) { $linkedRef = $m.Groups[1].Value; break }
  }
} catch {}

$action = 'Already correct'
if (-not $appRef) { $action = 'No SUPABASE_URL found in env files' }
elseif (-not $linkedRef) { $action = 'Not linked' }
elseif ($linkedRef -ne $appRef) { $action = 'Mismatch - relinking' }

if ($appRef -and (($linkedRef -eq $null) -or ($linkedRef -ne $appRef))) {
  try {
    $null = supabase link --project-ref $appRef 2>&1 | Out-String
    # Refresh link status
    $linkStatus = supabase link status 2>&1 | Out-String
    # Try parse again
    $linkedRef = $null
    $m = [regex]::Match($linkStatus, '(?im)ref\s*[:=]\s*([a-z0-9-]{6,})')
    if ($m.Success) { $linkedRef = $m.Groups[1].Value }
    if ($linkedRef -eq $appRef) { $action = 'Linked to app project ref' } else { $action = 'Link attempted; verify status' }
  } catch {
    $action = 'Link failed: ' + ($_ | Out-String)
  }
}

$lines = @()
$lines += 'SUPABASE_URL: ' + ($(if ($supabaseUrl) { $supabaseUrl } else { '(not found)' }))
$lines += 'APP_PROJECT_REF: ' + ($(if ($appRef) { $appRef } else { '(n/a)' }))
$lines += 'LINKED_PROJECT_REF(before): ' + ($(if ($linkedRef) { $linkedRef } else { '(none or unparsed)' }))
$lines += 'Action: ' + $action

$out = $lines -join "`r`n"
$out | Set-Content -Path $ReportPath -Encoding UTF8

Write-Host '=== codex_link_report.txt ==='
Write-Host $out
Write-Host '=== end ==='
