Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location C:\grookai_vault

function To-Plain([securestring]$s) {
  if (-not $s) { return '' }
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) } }
}

Write-Host 'Updating keys safely: GitHub repo secrets and (optionally) Supabase project secrets.' -ForegroundColor Cyan

# Check gh auth
try { gh auth status | Out-Null } catch { throw 'GitHub CLI not authenticated. Run: gh auth login' }

$pubSec = Read-Host -AsSecureString -Prompt 'Enter SUPABASE_PUBLISHABLE_KEY (sb_publishable_*)'
$srvSec = Read-Host -AsSecureString -Prompt 'Enter SUPABASE_SECRET_KEY (sb_secret_*)'

$pub = To-Plain $pubSec
$srv = To-Plain $srvSec
if (-not $pub -or -not $srv) { throw 'Both keys are required.' }

Write-Host 'Setting GitHub repo secrets (masked)...' -ForegroundColor Yellow
$pub | gh secret set PROD_PUBLISHABLE_KEY | Out-Null
$srv | gh secret set SUPABASE_SECRET_KEY | Out-Null
Write-Host 'GitHub secrets updated: PROD_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY' -ForegroundColor Green

$hasSupabase = (Get-Command supabase -ErrorAction SilentlyContinue) -ne $null
if (-not $hasSupabase) {
  Write-Host 'Supabase CLI not found. Skipping project secrets. Install supabase CLI to set project secrets.' -ForegroundColor Yellow
  exit 0
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host 'SUPABASE_ACCESS_TOKEN not set in this shell. Skipping project secrets.' -ForegroundColor Yellow
  Write-Host 'Tip: set SUPABASE_ACCESS_TOKEN, then rerun to update project secrets.' -ForegroundColor Yellow
  exit 0
}

$proj = 'ycdxbpibncqcchqiihfz'
Write-Host "Setting Supabase project secrets for $proj ..." -ForegroundColor Yellow

try {
  supabase secrets set --project-ref $proj SUPABASE_PUBLISHABLE_KEY=$pub SUPABASE_SECRET_KEY=$srv | Out-Null
  Write-Host 'Supabase project secrets updated: SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY' -ForegroundColor Green
} catch {
  Write-Host 'Failed to set Supabase project secrets. Verify access token and permissions.' -ForegroundColor Red
  throw
}

