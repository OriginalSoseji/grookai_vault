# scripts/audit_edge_auth_v1.ps1
$ErrorActionPreference = "Stop"

$root = Resolve-Path "."
$funcRoot = Join-Path $root "supabase\functions"

$indexFiles = Get-ChildItem -Path $funcRoot -Recurse -Filter "index.ts" -File

$findings = @()

foreach ($f in $indexFiles) {
  $p = $f.FullName
  $txt = Get-Content $p -Raw

  if ($p -notmatch "\\_shared\\auth\.ts$") {
    if ($txt -match "function\s+extractBearerToken") {
      $findings += "DUP_EXTRACTOR: $p"
    }
  }

  if ($txt -match "diag_headers|diag_token|diag_env") {
    $findings += "DIAG_LEFTOVER: $p"
  }

  if ($p -match "\\identity_scan_(get|enqueue)_v1\\index\.ts$") {
    if ($txt -notmatch "\.\./_shared/auth\.ts") {
      $findings += "MISSING_SHARED_AUTH_IMPORT: $p"
    }
  }
}

if ($findings.Count -gt 0) {
  Write-Host "EDGE AUTH AUDIT FAILED:" -ForegroundColor Red
  $findings | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "EDGE AUTH AUDIT PASS" -ForegroundColor Green
exit 0
