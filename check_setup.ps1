# Save as and run in your repo root:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File tools\check_setup.ps1
# …or just paste this whole block directly in the terminal.

$root = Get-Location
function ok($b){ if($b){"✅"}else{"❌"} }

Write-Host "Grookai Vault setup check at $root`n"

# --- FILE / FOLDER CHECKS ---
$need = @{
  "docs/CONTEXT_PACK.md"             = Test-Path "docs/CONTEXT_PACK.md"
  "docs/CONTEXT_PACK.json"           = Test-Path "docs/CONTEXT_PACK.json"
  "docs/STATE_OF_PROJECT.md"         = Test-Path "docs/STATE_OF_PROJECT.md"
  "docs/DECISIONS.md"                = Test-Path "docs/DECISIONS.md"
  "docs/API_SURFACE.md"              = Test-Path "docs/API_SURFACE.md"
  "supabase/functions/ai-assist/index.ts" = Test-Path "supabase/functions/ai-assist/index.ts"
  "supabase/functions/dev/index.ts"       = Test-Path "supabase/functions/dev/index.ts"
  "dev.api.http (optional)"          = Test-Path "dev.api.http"
}

"=== Files & Folders ==="
$need.GetEnumerator() | ForEach-Object {
  "{0} {1}" -f (ok($_.Value)), $_.Key
}

# Duplicate price_tiers_sheet.dart?
$tiers = Get-ChildItem -Recurse -Include price_tiers_sheet.dart -ErrorAction SilentlyContinue | % FullName
$dup = ($tiers | Measure-Object).Count -gt 1
"{0} Duplicate price_tiers_sheet.dart files" -f (ok(-not $dup))
if ($dup) {
  "   Found:"; $tiers | ForEach-Object { "   - $_" }
}

# Secrets in lib/secrets.dart?
$secretsWarn = $false
if (Test-Path "lib\secrets.dart") {
  $content = Get-Content "lib\secrets.dart" -Raw
  if ($content -match "sk-[A-Za-z0-9]" -or $content -match "service_role" -or $content -match "OPENAI") { $secretsWarn = $true }
}
"{0} No sensitive keys in lib/secrets.dart" -f (ok(-not $secretsWarn))
if ($secretsWarn) { "   WARNING: Move real secrets to Supabase Secrets." }

# --- DB / MIGRATIONS PRESENCE (filesystem-level) ---
$hasVaultTableSql = Select-String -Path (Get-ChildItem -Recurse supabase\*.sql) -Pattern "create table.*vault_items" -SimpleMatch -Quiet
$hasVaultRpcSql   = Select-String -Path (Get-ChildItem -Recurse supabase\*.sql) -Pattern "function public\.vault_add_item" -Quiet
"=== SQL Artifacts (files) ==="
"{0} SQL defines table public.vault_items" -f (ok($hasVaultTableSql))
"{0} SQL defines RPC public.vault_add_item" -f (ok($hasVaultRpcSql))

# --- SUPABASE CLI CHECKS (remote) ---
function Have-Supabase { (Get-Command supabase -ErrorAction SilentlyContinue) -ne $null }
if (Have-Supabase) {
  "=== Supabase (remote) ==="
  try {
    $secrets = supabase secrets list 2>$null
    $hasOpenAI = $secrets -match "OPENAI_API_KEY"
    $hasDevTok = $secrets -match "GPT_ACTION_TOKEN"
    "{0} Secret: OPENAI_API_KEY"  -f (ok($hasOpenAI))
    "{0} Secret: GPT_ACTION_TOKEN" -f (ok($hasDevTok))
  } catch { "   (Could not list secrets — run: supabase login & supabase link)" }

  try {
    $fl = supabase functions list 2>$null
    $hasAssist = $fl -match "ai-assist"
    $hasDev    = $fl -match "dev"
    "{0} Function deployed: ai-assist" -f (ok($hasAssist))
    "{0} Function deployed: dev"       -f (ok($hasDev))
  } catch { "   (Could not list functions — run: supabase login & link)" }
} else {
  "=== Supabase CLI not found ==="
  "   Install from https://supabase.com/docs/guides/cli"
}

# --- SUMMARY / NEXT STEPS ---
"`n=== Summary ==="
$missing = @()
$need.GetEnumerator() | ? { -not $_.Value -and $_.Key -notmatch "optional" } | % { $missing += $_.Key }
if ($dup)        { $missing += "Resolve duplicate price_tiers_sheet.dart (keep lib/widgets/price_tiers_sheet.dart)" }
if ($secretsWarn){ $missing += "Move secrets out of lib/secrets.dart into Supabase Secrets" }
if (-not $hasVaultTableSql){ $missing += "Add SQL migration for table public.vault_items" }
if (-not $hasVaultRpcSql)  { $missing += "Add SQL migration for RPC public.vault_add_item" }

if ($missing.Count -eq 0) { "✅ Looks good. Nothing critical missing." }
else {
  "❌ Missing / Actions needed:"
  $missing | ForEach-Object { " - $_" }
}

"`nTip: Re-run this anytime:  pwsh -NoProfile -ExecutionPolicy Bypass -File tools\check_setup.ps1"
