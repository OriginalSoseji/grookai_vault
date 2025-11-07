<#
  Ensures Supabase Storage buckets for Public Wall MVP.
  - Idempotent: does nothing if bucket/policies already exist
  - Windows/PowerShell-first
  - Redacts secrets in any output files

  Requires env (.env) keys:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)

  Outputs diagnostics to scripts/diagnostics/output/storage_buckets.md
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-DotEnv($path) {
  if (!(Test-Path $path)) { return @{} }
  $map = @{}
  foreach ($line in Get-Content $path) {
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*$') { continue }
    $kv = $line -split '=', 2
    if ($kv.Count -eq 2) {
      $k = $kv[0].Trim(); $v = $kv[1].Trim().Trim('"')
      $map[$k] = $v
    }
  }
  return $map
}

$root = Split-Path -Parent $PSCommandPath
$repo = Resolve-Path (Join-Path $root '..' '..')
$envFile = Join-Path $repo '.env'
$envMap = Read-DotEnv $envFile

$SUPABASE_URL = $env:SUPABASE_URL
if (-not $SUPABASE_URL) { $SUPABASE_URL = $envMap['SUPABASE_URL'] }
$SERVICE_ROLE = $env:SUPABASE_SECRET_KEY
if (-not $SERVICE_ROLE) { $SERVICE_ROLE = $env:SUPABASE_SERVICE_ROLE_KEY }
if (-not $SERVICE_ROLE) { $SERVICE_ROLE = $env:SERVICE_ROLE_KEY }
if (-not $SERVICE_ROLE) { $SERVICE_ROLE = $envMap['SUPABASE_SECRET_KEY'] }
if (-not $SERVICE_ROLE) { $SERVICE_ROLE = $envMap['SUPABASE_SERVICE_ROLE_KEY'] }
if (-not $SERVICE_ROLE) { $SERVICE_ROLE = $envMap['SERVICE_ROLE_KEY'] }

if (-not $SUPABASE_URL -or -not $SERVICE_ROLE) {
  Write-Host '[ensure_buckets] Missing SUPABASE_URL or SERVICE_ROLE key; exiting.'
  exit 0
}

$bucketId = 'listing-photos'
$diagDir = Join-Path $repo 'scripts/diagnostics/output'
New-Item -ItemType Directory -Force -Path $diagDir | Out-Null
$diagFile = Join-Path $diagDir 'storage_buckets.md'

# Redaction helper
function Redact($s) {
  if (-not $s) { return $s }
  return ($s -replace '([A-Za-z0-9]{6})[A-Za-z0-9\-_]+', '$1•••')
}

# Use Supabase Management API: Storage buckets via REST
# Note: We avoid network writes that mutate policies; reads and idempotent create only.
try {
  $headers = @{ 'apikey' = $SERVICE_ROLE; 'Content-Type' = 'application/json' }
  $bucketsUrl = "$SUPABASE_URL/storage/v1/bucket"
  $list = Invoke-RestMethod -Method Get -Uri ($bucketsUrl + 's') -Headers $headers -ErrorAction Stop
  $exists = $false
  foreach ($b in $list) { if ($b.name -eq $bucketId) { $exists = $true; break } }
  if (-not $exists) {
    $body = @{ name = $bucketId; public = $true } | ConvertTo-Json -Compress
    try {
      Invoke-RestMethod -Method Post -Uri $bucketsUrl -Headers $headers -Body $body | Out-Null
      Write-Host "[ensure_buckets] Created bucket '$bucketId'"
    } catch {
      if ($_.Exception.Response.StatusCode.Value__ -eq 409) {
        Write-Host "[ensure_buckets] Bucket '$bucketId' already exists (409)." 
      } else { throw }
    }
  } else {
    Write-Host "[ensure_buckets] Bucket '$bucketId' already exists."
  }

  # Diagnostics: list buckets (redacted), note that public/ path should be readable via RLS/policies
  $redactedUrl = Redact $SUPABASE_URL
  $md = @()
  $md += "# Storage Buckets"
  $md += "- Supabase URL: $redactedUrl"
  $md += "- Checked bucket: $bucketId"
  $md += "- Thumbs path: listing-photos/public/thumbs/<listingId>_720x960.jpg"
  $md += ""
  $md += "## Buckets"
  foreach ($b in $list) {
    $md += "- name: $($b.name) | public: $($b.public) | owner: (redacted)"
  }
  if (-not $exists) {
    # Re-list to capture the newly created bucket
    $list = Invoke-RestMethod -Method Get -Uri ($bucketsUrl + 's') -Headers $headers -ErrorAction SilentlyContinue
  }
  $md += ""
  $md += "## Policy Note"
  $md += "Objects under 'listing-photos/public/**' must be publicly readable. Ensure your Storage policies permit read for anon on that prefix."
  Set-Content -Path $diagFile -Value ($md -join "`n")
} catch {
  Write-Warning ("[ensure_buckets] Error: " + $_.Exception.Message)
}

Write-Host '[ensure_buckets] Done.'
