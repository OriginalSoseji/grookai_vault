param(
  [string]$ProjectRef
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg){ Write-Host $msg -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host $msg -ForegroundColor Red }

try {
  # 1) Link project
  if ($ProjectRef -and $ProjectRef.Trim().Length -gt 0) {
    Write-Info "Linking Supabase project: $ProjectRef"
    supabase link --project-ref $ProjectRef
  } else {
    Write-Warn "No -ProjectRef provided. If not linked, run these commands in another terminal:"
    Write-Host "  supabase projects list"
    Write-Host "  supabase link"
  }

  # 2) Align migrations (optional)
  $align = Join-Path (Join-Path $PSScriptRoot '..') 'tools/align_migrations.ps1'
  if (Test-Path $align) {
    Write-Info "Running align_migrations.ps1 (optional)…"
    try {
      $psi = 'powershell'
      $cmd = "& '" + ($align -replace "'","''") + "'"
      $p = Start-Process -FilePath $psi -ArgumentList @('-NoProfile','-Command',$cmd) -PassThru -Wait -WindowStyle Hidden
      if ($p.ExitCode -ne 0) { Write-Warn "align_migrations.ps1 exit code $($p.ExitCode)" }
    } catch { Write-Warn "align_migrations.ps1 reported: $($_.Exception.Message)" }
  } else {
    Write-Warn "align_migrations.ps1 not found; skipping alignment."
  }

  # 3) Push migrations
  Write-Info "Pushing migrations (supabase db push --debug)…"
  supabase db push --debug
  $rc = $LASTEXITCODE
  if ($rc -ne 0) { Write-Err "supabase db push failed with exit code $rc"; exit $rc }
  Write-Host "DB push completed." -ForegroundColor Green
  exit 0
} catch {
  Write-Err "ERROR: $($_.Exception.Message)"
  exit 1
}
