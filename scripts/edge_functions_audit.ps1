Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Ensure we are at repo root
Set-Location 'C:\grookai_vault'
$root = Get-Location

Write-Host "[audit] Repo root: $($root.Path)"

# -------- 1) Discover Edge Functions --------
$funcRoot = Join-Path $root 'supabase\functions'
$functions = @()

if (-not (Test-Path $funcRoot)) {
  Write-Host "[audit] No supabase/functions directory found. Exiting."
  return
}

$entryNames = @('index.ts','index.tsx','index.mjs','index.js')

Get-ChildItem $funcRoot -Directory | ForEach-Object {
  $dir = $_
  $slug = $dir.Name

  $entry = Get-ChildItem $dir.FullName -File -ErrorAction SilentlyContinue |
    Where-Object { $entryNames -contains $_.Name } |
    Select-Object -First 1

  if (-not $entry) {
    Write-Host "[audit] Skipping $slug (no index entry found)"
    return
  }

  $configPath = Join-Path $dir.FullName 'config.toml'
  $verifyJwt = $null
  $configRaw = $null

  if (Test-Path $configPath) {
    $configRaw = Get-Content $configPath -Raw
    if ($configRaw -match 'verify_jwt\s*=\s*true') { $verifyJwt = $true }
    elseif ($configRaw -match 'verify_jwt\s*=\s*false') { $verifyJwt = $false }
  }

  $content = Get-Content $entry.FullName -Raw

  $usesBridge = ($content -match 'x-bridge-token') -or ($content -match 'BRIDGE_IMPORT_TOKEN')

  $legacyEnvNames = @()
  foreach ($name in @('SUPABASE_ANON_KEY','ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SERVICE_ROLE_KEY','SRK')) {
    if ($content -match [regex]::Escape($name)) { $legacyEnvNames += $name }
  }
  $legacyEnvNames = $legacyEnvNames | Sort-Object -Unique

  $manualJwt = $false
  if ($content -match 'SignJWT' -or $content -match 'jsonwebtoken' -or $content -match 'jwt\.sign' -or $content -match 'jose') {
    $manualJwt = $true
  }

  $hasHealth = $content -match 'mode' -and $content -match '"health"'
  $hasCommand = $content -match 'mode' -and $content -match '"command"'
  $hasWorker = $content -match 'mode' -and $content -match '"worker"'

  $authPattern = 'unknown/mixed'
  if ($usesBridge) { $authPattern = 'bridge-protected' }
  if ($manualJwt) { $authPattern = 'manual-jwt' }
  if ($content -match 'createClient' -and $content -match 'SUPABASE_SECRET_KEY') {
    $authPattern = 'secret-key/supabase-js'
  }
  if ($hasHealth -and -not $usesBridge -and -not $manualJwt) {
    $authPattern = 'public-health'
  }

  $relEntry = $entry.FullName.Substring($root.Path.Length + 1).Replace('\','/')

  $functions += [PSCustomObject]@{
    slug               = $slug
    entry_file         = $relEntry
    config_verify_jwt  = $verifyJwt
    config_raw         = $configRaw
    auth_pattern       = $authPattern
    has_health_mode    = [bool]$hasHealth
    has_command_mode   = [bool]$hasCommand
    has_worker_mode    = [bool]$hasWorker
    uses_bridge_token  = [bool]$usesBridge
    legacy_envs_used   = $legacyEnvNames
    manual_jwt_signing = [bool]$manualJwt
    callers            = @()
  }

  Write-Host "[audit] Function discovered: $slug"
}

$funcCount = $functions.Count
Write-Host "[audit] Total functions found: $funcCount"

# -------- 2) Find Callers (CI / scripts / client) --------
$pathsToScan = @('.github\workflows','scripts','supabase','lib','packages')
$files = @()

foreach ($p in $pathsToScan) {
  $full = Join-Path $root $p
  if (Test-Path $full) {
    $files += Get-ChildItem $full -Recurse -File -ErrorAction SilentlyContinue
  }
}

Write-Host "[audit] Files to scan for callers: $($files.Count)"

foreach ($func in $functions) {
  $slug = $func.slug
  $callers = @()

  foreach ($file in $files) {
    $text = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($text -notmatch [regex]::Escape($slug)) { continue }

    $category = if ($file.FullName -like '*\.github\workflows*') {'ci-workflow'}
      elseif ($file.FullName -like '*\scripts\*') {'powershell-script'}
      elseif ($file.Extension -eq '.dart') {'client-dart'}
      elseif ($file.Extension -in @('.ts','.tsx','.js','.mjs','.cjs')) {'node-script'}
      else {'other'}

    $urlPattern = $null
    if ($text -match "functions\.supabase\.co\S*$slug") {
      $urlPattern = $matches[0]
    }

    $headers = @()
    if ($text -match 'Authorization') { $headers += 'Authorization' }
    if ($text -match 'apikey')        { $headers += 'apikey' }
    if ($text -match 'x-bridge-token'){ $headers += 'x-bridge-token' }
    $headers = $headers | Sort-Object -Unique

    $relFile = $file.FullName.Substring($root.Path.Length + 1).Replace('\','/')

    $callers += [PSCustomObject]@{
      category    = $category
      file        = $relFile
      url_pattern = $urlPattern
      headers     = $headers
    }
  }

  $func.callers = $callers
}

# -------- 3) Global Legacy Env & JWT Scan --------
$allFiles = Get-ChildItem $root -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
  $_.FullName -notlike '*\node_modules\*' -and
  $_.FullName -notlike '*\.git\*'         -and
  $_.FullName -notlike '*\reports\*'
}

$legacyHits = @()
$legacyPatterns = @('SUPABASE_ANON_KEY','ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SERVICE_ROLE_KEY','SRK')

foreach ($pat in $legacyPatterns) {
  $hits = Select-String -Path $allFiles.FullName -Pattern $pat -ErrorAction SilentlyContinue
  foreach ($h in $hits) {
    $rel = $h.Path.Substring($root.Path.Length + 1).Replace('\\','/')
    $legacyHits += [PSCustomObject]@{
      file  = $rel
      line  = $h.LineNumber
      match = $pat
      note  = 'legacy env name'
    }
  }
}

$jwtHits = @()
$jwtPatterns = @('jose','jsonwebtoken','SignJWT','jwt\.sign','ES256')

foreach ($pat in $jwtPatterns) {
  $hits = Select-String -Path $allFiles.FullName -Pattern $pat -ErrorAction SilentlyContinue
  foreach ($h in $hits) {
    $rel = $h.Path.Substring($root.Path.Length + 1).Replace('\\','/')
    $jwtHits += [PSCustomObject]@{
      file  = $rel
      line  = $h.LineNumber
      match = $pat
      note  = 'manual JWT usage'
    }
  }
}

# -------- 4) Write Reports --------
$timestamp    = Get-Date -Format 'yyyyMMdd_HHmmss'
$timestampIso = Get-Date -Format 's'
$reportsDir   = Join-Path $root 'reports'

if (-not (Test-Path $reportsDir)) {
  New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

$mdPath   = Join-Path $reportsDir "edge_functions_audit_$timestamp.md"
$jsonPath = Join-Path $reportsDir "edge_functions_audit_$timestamp.json"

$verifyTrue    = ($functions | Where-Object { $_.config_verify_jwt -eq $true }).Count
$verifyFalse   = ($functions | Where-Object { $_.config_verify_jwt -eq $false }).Count
$verifyMissing = ($functions | Where-Object { $null -eq $_.config_verify_jwt }).Count
$bridgeCount   = ($functions | Where-Object { $_.uses_bridge_token }).Count
$manualJwtCount= ($functions | Where-Object { $_.manual_jwt_signing }).Count

$lines = @()
$lines += "# Edge Functions Auth & JWT Audit ($((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')))"
$lines += ""
$lines += "## Overview"
$lines += ""
$lines += "- Functions found: $funcCount"
$lines += "- verify_jwt=true: $verifyTrue; false: $verifyFalse; missing: $verifyMissing"
$lines += "- Functions using bridge token: $bridgeCount"
$lines += "- Functions with manual JWT patterns: $manualJwtCount"
$lines += ""

$lines += "## Per-Function Summary"
$lines += ""
$lines += "| slug | verify_jwt | auth_pattern | health_mode | bridge_token | callers_count | legacy_envs? | manual_jwt? |"
$lines += "|------|------------|--------------|-------------|--------------|---------------|--------------|------------|"

foreach ($f in $functions) {
  $vj = if ($f.config_verify_jwt -eq $true) {'true'}
        elseif ($f.config_verify_jwt -eq $false) {'false'}
        else {'missing'}

  $legacyFlag = if ($f.legacy_envs_used.Count -gt 0) {'Y'} else {'N'}
  $manualFlag = if ($f.manual_jwt_signing) {'Y'} else {'N'}

  $lines += "| $($f.slug) | $vj | $($f.auth_pattern) | $($f.has_health_mode) | $($f.uses_bridge_token) | $($f.callers.Count) | $legacyFlag | $manualFlag |"
}

$lines += ""
$lines += "## Per-Function Details"
$lines += ""

foreach ($f in $functions) {
  $lines += "### $($f.slug)"
  $lines += ""
  $lines += "- Entry: `$( $f.entry_file )`"
  $vj = if ($f.config_verify_jwt -eq $true) {'true'}
        elseif ($f.config_verify_jwt -eq $false) {'false'}
        else {'missing'}
  $lines += "- Config: `verify_jwt=$vj`"
  $lines += "- Auth pattern: `$( $f.auth_pattern )`"

  $modeList = @()
  if ($f.has_health_mode)  { $modeList += 'health' }
  if ($f.has_command_mode) { $modeList += 'command' }
  if ($f.has_worker_mode)  { $modeList += 'worker' }
  $modeStr = if ($modeList.Count -gt 0) { $modeList -join ', ' } else { 'none detected' }
  $lines += "- Modes: $modeStr"

  $lines += "- Bridge token: " + ($(if ($f.uses_bridge_token) {'yes'} else {'no'}))

  if ($f.legacy_envs_used.Count -gt 0) {
    $lines += "- Legacy envs: " + ($f.legacy_envs_used -join ', ')
  } else {
    $lines += "- Legacy envs: none"
  }

  $lines += "- Manual JWT: " + ($(if ($f.manual_jwt_signing) {'yes'} else {'no'}))
  $lines += "- Callers:"

  if ($f.callers.Count -eq 0) {
    $lines += "  - (none found)"
  } else {
    foreach ($c in $f.callers) {
      $hdrStr = if ($c.headers.Count -gt 0) { $c.headers -join ', ' } else { 'none' }
      $lines += "  - $( $c.category ) — `$( $c.file )` — headers: [$hdrStr]"
    }
  }

  $lines += ""
}

$lines += "## Global Legacy Env & Manual JWT Usage"
$lines += ""

if ($legacyHits.Count -eq 0 -and $jwtHits.Count -eq 0) {
  $lines += "_No legacy envs or manual JWT usage found outside functions (with the patterns searched)._"
} else {
  if ($legacyHits.Count -gt 0) {
    $lines += "### Legacy Env Names"
    foreach ($h in $legacyHits | Sort-Object file, line) {
      $lines += "- $( $h.file ):$( $h.line ) — `$( $h.match )` — $( $h.note )"
    }
    $lines += ""
  }
  if ($jwtHits.Count -gt 0) {
    $lines += "### Manual JWT / JWT Libraries"
    foreach ($h in $jwtHits | Sort-Object file, line) {
      $lines += "- $( $h.file ):$( $h.line ) — `$( $h.match )` — $( $h.note )"
    }
    $lines += ""
  }
}

$lines += "## Quick Risk Flags"
$lines += ""
$riskLines = @()

$riskLines += ($functions | Where-Object { $_.config_verify_jwt -eq $true -and $_.uses_bridge_token -and -not $_.manual_jwt_signing } | ForEach-Object {
  "- Function `$( $_.slug )` has verify_jwt=true and bridge token; ensure callers provide a valid JWT plus x-bridge-token."
})
$riskLines += ($functions | Where-Object { $_.legacy_envs_used.Count -gt 0 } | ForEach-Object {
  "- Function `$( $_.slug )` references legacy env names: $( $_.legacy_envs_used -join ', ' )"
})
$riskLines += ($functions | Where-Object { $_.manual_jwt_signing } | ForEach-Object {
  "- Function `$( $_.slug )` uses manual JWT signing; consider moving to supabase-js + SECRET key."
})
$riskLines += ($functions | Where-Object { $_.callers.Count -eq 0 } | ForEach-Object {
  "- Function `$( $_.slug )` has no callers detected; check if it is dead/experimental."
})

if ($riskLines.Count -eq 0) {
  $lines += "_No obvious risks based on the scanned patterns._"
} else {
  $lines += $riskLines
}

$lines | Set-Content -LiteralPath $mdPath -NoNewline

# JSON summary
$json = [PSCustomObject]@{
  generated_at             = $timestampIso
  functions                = $functions
  global_legacy_env_hits   = $legacyHits
  global_manual_jwt_hits   = $jwtHits
}

$json | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $jsonPath -NoNewline

$relMd   = $mdPath.Substring($root.Path.Length + 1).Replace('\\','/')
$relJson = $jsonPath.Substring($root.Path.Length + 1).Replace('\\','/')

Write-Host "Edge functions audit complete."
Write-Host "Markdown report: $relMd"
Write-Host "JSON report: $relJson"
Write-Host "Functions found: $funcCount"
Write-Host "Functions with legacy envs: " (($functions | Where-Object { $_.legacy_envs_used.Count -gt 0 }).Count)
Write-Host "Functions with manual JWT: $manualJwtCount"
