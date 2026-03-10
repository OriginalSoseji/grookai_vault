param(
  [switch]$RequireSupabaseDbUrl
)

function Flag($x) { if ([string]::IsNullOrEmpty($x)) { "NOT_SET" } else { "SET" } }

$proc = $env:DATABASE_URL
$user = [Environment]::GetEnvironmentVariable("DATABASE_URL","User")
$mach = [Environment]::GetEnvironmentVariable("DATABASE_URL","Machine")
$sb   = $env:SUPABASE_DB_URL

Write-Host "DB ENV AUDIT (safe)" -ForegroundColor Cyan
Write-Host ("  DATABASE_URL Process : " + (Flag $proc))
Write-Host ("  DATABASE_URL User    : " + (Flag $user))
Write-Host ("  DATABASE_URL Machine : " + (Flag $mach))
Write-Host ("  SUPABASE_DB_URL Proc : " + (Flag $sb))

if (-not [string]::IsNullOrEmpty($proc) -or -not [string]::IsNullOrEmpty($user) -or -not [string]::IsNullOrEmpty($mach)) {
  Write-Host ""
  Write-Host "POISON DETECTED: DATABASE_URL is set and can override runners (ENOTFOUND base risk)." -ForegroundColor Red
  Write-Host "Fix for this session:" -ForegroundColor Yellow
  Write-Host "  Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue" -ForegroundColor Yellow
  Write-Host "  `$env:SUPABASE_DB_URL=`"<remote-connection-string>`"" -ForegroundColor Yellow
  exit 1
}

if ($RequireSupabaseDbUrl -and [string]::IsNullOrEmpty($sb)) {
  Write-Host ""
  Write-Host "Missing SUPABASE_DB_URL in process env. Set it explicitly for remote runs." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "OK: No DATABASE_URL poison detected." -ForegroundColor Green