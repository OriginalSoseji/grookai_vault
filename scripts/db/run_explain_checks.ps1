param()
$ErrorActionPreference='Stop'

function Root { (git rev-parse --show-toplevel) }
Set-Location (Root)

$outDir = "scripts/diagnostics/output"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$summary = Join-Path $outDir "EXPLAIN_SUMMARY.md"

function Load-DotEnv { $m=@{}; if(Test-Path '.env'){ Get-Content .env | ?{ $_ -match '=' -and -not $_.Trim().StartsWith('#') } | % { $p=$_.Split('=',2); if($p.Length -eq 2){ $m[$p[0].Trim()]=$p[1].Trim() } } }; return $m }
$envMap = Load-DotEnv
$dbUrl = $env:SUPABASE_DB_URL; if(-not $dbUrl){ $dbUrl = $envMap['SUPABASE_DB_URL'] }
if (-not $dbUrl) { Write-Host "Missing SUPABASE_DB_URL in env/.env" -ForegroundColor Yellow; exit 1 }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { Write-Host "psql not found on PATH" -ForegroundColor Yellow; exit 1 }

$sqlPath = "scripts/db/explain_checks.sql"
if (-not (Test-Path $sqlPath)) { Write-Host "Missing $sqlPath" -ForegroundColor Yellow; exit 1 }

try {
  $raw = & psql -X -q "$dbUrl" -f $sqlPath 2>&1 | Out-String
} catch { $raw = $_.Exception.Message }

$lines=@("# EXPLAIN Summary","_Generated: $(Get-Date)_")
$status=0
$plans = $raw -split "\n" | Where-Object { $_ -match '^EXPLAIN' -or $_ -match '^\s*Seq Scan' -or $_ -match 'Index Scan' -or $_ -match 'Bitmap' }
foreach($ln in $plans){
  $mark=''
  if ($ln -match 'Seq Scan') { $mark='RED'; $status=2 }
  elseif ($ln -match 'Bitmap' -or $ln -match 'Index Scan') { $mark='GREEN' }
  else { $mark='YELLOW' }
  $lines += ("- [{0}] {1}" -f $mark, $ln.Trim())
}
Set-Content -Path $summary -Value ($lines -join "`n")
exit $status

