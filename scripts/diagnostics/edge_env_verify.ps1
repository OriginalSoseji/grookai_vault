$ErrorActionPreference = 'Stop'

param(
  [switch]$Seed,
  [switch]$AutoFix,
  [int]$ThrottleMs = 150,
  [ValidateSet('cards','prices','both')][string]$FixMode = 'cards'
)

function Read-Secret {
  param(
    [Parameter(Mandatory=$true)][string]$Prompt,
    [switch]$IsUrl
  )
  return Read-Host -Prompt $Prompt
}

function Invoke-Supabase {
  param([string[]]$Args)
  $p = Start-Process -FilePath "supabase" -ArgumentList $Args -NoNewWindow -PassThru -Wait
  if ($p.ExitCode -ne 0) { throw "supabase $($Args -join ' ') failed with exit code $($p.ExitCode)" }
}

# --- Gather required values ---
$projHint = ''
$projEnv = $env:PROJECT_REF
if ($projEnv) { $projHint = $projEnv }

$SUPABASE_URL = Read-Secret "SUPABASE_URL (e.g., https://<ref>.supabase.co)" -IsUrl
while ([string]::IsNullOrWhiteSpace($SUPABASE_URL)) {
  Write-Warning "SUPABASE_URL is required. Example: https://$projHint.supabase.co"
  $SUPABASE_URL = Read-Secret "SUPABASE_URL (e.g., https://$projHint.supabase.co)" -IsUrl
}

# Derive project ref from URL
$proj = $null
try {
  if ($SUPABASE_URL -match 'https?://([a-z0-9\-]+)\.supabase\.co') { $proj = $Matches[1] }
} catch {}
if (-not $proj) {
  $proj = Read-Host -Prompt "Project ref (subdomain before .supabase.co)"
}

$PROJECT_URL = Read-Secret "PROJECT_URL (usually same as SUPABASE_URL)" -IsUrl
while ([string]::IsNullOrWhiteSpace($PROJECT_URL)) {
  Write-Warning "PROJECT_URL is required. Usually same as SUPABASE_URL."
  $PROJECT_URL = Read-Secret "PROJECT_URL (usually same as SUPABASE_URL)" -IsUrl
}

$SUPABASE_ANON_KEY         = Read-Secret "SUPABASE_ANON_KEY (anon jwt)"
$SUPABASE_SERVICE_ROLE_KEY = Read-Secret "SUPABASE_SERVICE_ROLE_KEY (service_role jwt)"
$POKEMONTCG_API_KEY        = Read-Secret "POKEMONTCG_API_KEY (optional)"

# Auto-fix related vars
$CHECK_SETS_AUTO_FIX    = if ($AutoFix) { 'true' } else { Read-Secret "CHECK_SETS_AUTO_FIX (true/false) [default: false]" }
$CHECK_SETS_FIX_MODE    = $FixMode
$CHECK_SETS_THROTTLE_MS = "$ThrottleMs"

# --- Push Function Secrets (prod) ---
Write-Host ""
Write-Host "Pushing function secrets to prod..." -ForegroundColor Green

$secArgs = @(
  "secrets","set","--env","prod","--project-ref",$proj,
  "SUPABASE_URL=$SUPABASE_URL",
  "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY",
  "PROJECT_URL=$PROJECT_URL"
)
if ($POKEMONTCG_API_KEY)     { $secArgs += "POKEMONTCG_API_KEY=$POKEMONTCG_API_KEY" }
if ($CHECK_SETS_AUTO_FIX)    { $secArgs += "CHECK_SETS_AUTO_FIX=$CHECK_SETS_AUTO_FIX" }
if ($CHECK_SETS_FIX_MODE)    { $secArgs += "CHECK_SETS_FIX_MODE=$CHECK_SETS_FIX_MODE" }
if ($CHECK_SETS_THROTTLE_MS) { $secArgs += "CHECK_SETS_THROTTLE_MS=$CHECK_SETS_THROTTLE_MS" }

Invoke-Supabase -Args $secArgs

# --- Deploy functions ---
Invoke-Supabase -Args @("functions","deploy","import-cards","--project-ref",$proj)
Invoke-Supabase -Args @("functions","deploy","check-sets","--project-ref",$proj)

# --- Health checks ---
Write-Host ""
Write-Host "Health check: import-cards (GET)" -ForegroundColor Cyan
$healthUrl = ($SUPABASE_URL.TrimEnd('/')) + "/functions/v1/import-cards"
try {
  $h = Invoke-RestMethod -Method Get -Uri $healthUrl -Headers @{ accept='application/json' }
  $h | ConvertTo-Json -Depth 6 | Write-Host
} catch {
  Write-Warning "import-cards health failed: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Smoke check: check-sets (POST fix=false, limit=1)" -ForegroundColor Cyan
$csUrl = ($SUPABASE_URL.TrimEnd('/')) + "/functions/v1/check-sets"
try {
  $body = @{ fix = $false; limit = 1 } | ConvertTo-Json
  $resp = Invoke-RestMethod -Method Post -Uri $csUrl -Headers @{ 'content-type'='application/json' } -Body $body
  $resp | ConvertTo-Json -Depth 6 | Write-Host
} catch {
  Write-Warning "check-sets smoke failed: $($_.Exception.Message)"
}

# --- Optional seeding pass ---
if ($Seed) {
  Write-Host ""; Write-Host "Seeding: check-sets (fix=true)" -ForegroundColor Yellow
  try {
    $payload = @{ fix = $true; fixMode = $CHECK_SETS_FIX_MODE; throttleMs = [int]$CHECK_SETS_THROTTLE_MS } | ConvertTo-Json
    $seed = Invoke-RestMethod -Method Post -Uri $csUrl -Headers @{ 'content-type'='application/json' } -Body $payload
    $seed | ConvertTo-Json -Depth 6 | Write-Host
  } catch {
    Write-Warning "check-sets seed failed: $($_.Exception.Message)"
  }
}

