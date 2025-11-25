Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "[repair] Starting remote migration history repair..." -ForegroundColor Cyan

cd C:\grookai_vault

# 1) Backup remote DB (schema+data) to backups/remote_backup_<timestamp>.sql
$timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$backupDir = Join-Path (Get-Location) "backups"
if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$backupFile = Join-Path $backupDir "remote_backup_$timestamp.sql"
Write-Host "[repair] Taking remote DB backup to $backupFile..." -ForegroundColor Yellow

# supabase db dump writes to a file; use -f
supabase db dump -f $backupFile

Write-Host "[repair] Backup complete." -ForegroundColor Green

# 2) Repair migration history on REMOTE using the IDs suggested by Supabase CLI

Write-Host "[repair] Repairing remote migration history (marking legacy IDs as reverted)..." -ForegroundColor Cyan

# Mark older/legacy migrations as REVERTED (Supabase suggested these)
$revertedIds = @(
  "20251103",
  "20251104040802",
  "20251104090000",
  "20251104100000",
  "20251104100500",
  "20251104101000",
  "20251104102000",
  "20251104102500",
  "20251104103000",
  "20251104104500",
  "20251104120000",
  "20251104121000",
  "20251104122000",
  "20251104125950",
  "20251104130000",
  "20251104130010",
  "20251104130500",
  "20251104130510",
  "20251105120500",
  "20251105121200",
  "20251105130000",
  "20251105160000",
  "20251105160300",
  "20251105160500",
  "20251105161000"
)

foreach ($id in $revertedIds) {
  Write-Host "[repair] Marking $id as reverted..." -ForegroundColor DarkYellow
  supabase migration repair --status reverted $id
}

Write-Host "[repair] Marking newer known migrations as applied..." -ForegroundColor Cyan

# Mark known local migration files as APPLIED on remote
$appliedIds = @(
  "20251109072935",  # import_prices_definer.sql
  "20251112143000",  # admin_import_runs.sql
  "20251115031000",  # sets_card_prints_contract_v1.sql
  "20251115040000",  # ai_ingestion_schema_v1.sql
  "20251115041500"   # card_print_traits_v1.sql
)

foreach ($id in $appliedIds) {
  Write-Host "[repair] Marking $id as applied..." -ForegroundColor DarkYellow
  supabase migration repair --status applied $id
}

# 3) Verify by running supabase db push (REMOTE)
Write-Host "[repair] Verifying remote alignment with 'supabase db push'..." -ForegroundColor Cyan

supabase db push

Write-Host "[repair] Remote migration history repair complete." -ForegroundColor Green
Write-Host "[repair] If 'supabase db push' reported nothing to push or only applied the latest migrations once, history is now aligned." -ForegroundColor Green

