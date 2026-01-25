# scripts/audit_edge_auth_v1.ps1
$ErrorActionPreference = "Stop"

# Use literal relative paths to avoid Resolve-Path/Join-Path object array issues.
$targets = @(
  "supabase/functions/identity_scan_get_v1/index.ts",
  "supabase/functions/identity_scan_enqueue_v1/index.ts"
)

$findings = @()

foreach ($p in $targets) {
  if (-not (Test-Path $p)) {
    $findings += "MISSING_TARGET: $p"
    continue
  }

  $txt = Get-Content $p -Raw

  if ($txt -match "diag_headers|diag_token|diag_env") {
    $findings += "DIAG_LEFTOVER: $p"
  }

  # Scanner functions must use shared helper; local extractors are forbidden here.
  if ($txt -match "function\s+extractBearerToken") {
    $findings += "DUP_EXTRACTOR: $p"
  }

  if ($txt -notmatch "\.\./_shared/auth\.ts") {
    $findings += "MISSING_SHARED_AUTH_IMPORT: $p"
  }

  if ($txt -notmatch "requireUser") {
    $findings += "MISSING_REQUIRE_USER_USAGE: $p"
  }
}

if ($findings.Count -gt 0) {
  Write-Host "EDGE AUTH AUDIT FAILED:" -ForegroundColor Red
  $findings | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "EDGE AUTH AUDIT PASS" -ForegroundColor Green
exit 0