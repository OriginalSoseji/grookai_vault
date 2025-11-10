Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-Location (Split-Path -Parent $PSCommandPath)
Set-Location ..

# Config
$Owner   = "OriginalSoseji"
$Repo    = "grookai_vault"
$Ref     = "main"
$ProjRef = "ycdxbpibncqcchqiihfz"
$WfPath  = ".github/workflows/prod-import-prices-validate-edge.yml"
$Report  = "reports"; New-Item -ItemType Directory -Force -Path $Report | Out-Null
$LogsOut = Join-Path $Report "ci_logs"; New-Item -ItemType Directory -Force -Path $LogsOut | Out-Null
$CiLog   = Join-Path $Report "ci_import_prices_latest.log"
$FnLog   = Join-Path $Report "import_prices_fn_logs.txt"

function Hash8([string]$s){ if([string]::IsNullOrWhiteSpace($s)){return "<missing>"}; $sha=[Security.Cryptography.SHA256]::Create(); $b=[Text.Encoding]::UTF8.GetBytes($s); $h=$sha.ComputeHash($b); (-join ($h|ForEach-Object {$_.ToString('x2')})).Substring(0,8) }

# 1) Acquire bridge token: env fallback first, else secure prompt, else fail
$BRI = $env:BRIDGE_TOKEN_SESSION; if (-not $BRI) { $BRI = $env:BRIDGE_IMPORT_TOKEN }
if (-not $BRI) {
  try {
    $secure = Read-Host -AsSecureString "Paste BRIDGE_IMPORT_TOKEN (session only, not printed)"
    $BRI = (New-Object System.Net.NetworkCredential('', $secure)).Password
  } catch { $BRI = '' }
}
if ([string]::IsNullOrWhiteSpace($BRI)) { throw "Bridge token is required (set BRIDGE_TOKEN_SESSION or enter when prompted)." }
$env:BRIDGE_IMPORT_TOKEN = $BRI
$bri8 = Hash8 $BRI
Write-Host ("Bridge token hash8 (input): " + $bri8) -ForegroundColor Cyan

# 1a) Direct probe to Edge Functions using bridge-only header, capture HTTP status/body preview
$FnUrl = "https://$ProjRef.functions.supabase.co/import-prices"
$Body  = @{ ping = 'diag' }
$H     = @{ 'x-bridge-token' = $env:BRIDGE_IMPORT_TOKEN; apikey = $env:SUPABASE_PUBLISHABLE_KEY }
$Status = '<unknown>'
$BodyPreview = '<empty>'
try {
  $resp = Invoke-WebRequest -Method POST -Uri $FnUrl -Headers $H -Body ($Body | ConvertTo-Json) -ContentType 'application/json' -UseBasicParsing -TimeoutSec 30
  $Status = [string]$resp.StatusCode
  $BodyPreview = [string]$resp.Content
} catch {
  try { $Status = [string]$_.Exception.Response.StatusCode.value__ } catch { $Status = '<unknown>' }
  $BodyPreview = '<empty>'
}

# Determine gateway bearer visibility (not used in direct POST)
$GatewayAuth = 'apikey_only'

# 2) Sync token to GitHub + Supabase, redeploy import-prices
gh secret set BRIDGE_IMPORT_TOKEN --repo "$Owner/$Repo" --body "$BRI" | Out-Null
try { supabase secrets set BRIDGE_IMPORT_TOKEN="$BRI" --project-ref $ProjRef | Out-Null } catch { supabase secrets set BRIDGE_IMPORT_TOKEN="$BRI" | Out-Null }
try { supabase functions deploy import-prices --project-ref $ProjRef | Out-Null } catch { supabase functions deploy import-prices | Out-Null }

# 3) Dispatch edge validator, watch, store logs
try { gh workflow run $WfPath -r $Ref | Out-Null } catch {}
Start-Sleep -Seconds 4
$id = gh run list --workflow $WfPath --branch $Ref --limit 1 --json databaseId --jq '.[0].databaseId'
if (-not $id) { throw 'No workflow run found after dispatch' }
try { gh run watch $id | Out-Null } catch {}
gh run view $id --log | Out-File -Encoding utf8 $CiLog

# 4) Pull function logs and extract latest gate snapshot (retry up to 5x)
$header8 = '<none>'
$env8    = '<none>'
for ($i=0; $i -lt 5; $i++) {
  (supabase functions logs -f import-prices --project-ref $ProjRef 2>&1) | Out-File -Encoding utf8 $FnLog
  $m = Select-String -Path $FnLog -Pattern '\[IMPORT-PRICES\]\s+token\.check\s+header8=(\w+)\s+env8=(\w+)' -AllMatches | Select-Object -Expand Matches | Select-Object -Last 1
  if ($m) { $header8 = $m.Groups[1].Value; $env8 = $m.Groups[2].Value; break }
  Start-Sleep -Seconds 2
}

# 5) Parse six-line summary (robust)
$log = Get-Content $CiLog -Raw
function Grab($pats){ foreach($p in $pats){ $mm=[regex]::Match($log,$p,'IgnoreCase,Multiline'); if($mm.Success){ return $mm.Groups[1].Value.Trim() } } return '<not found>' }
$diagB  = Grab @('Diag\s+echo\s+B\s+code\s*[:=]\s*([0-9]{1,3}|<unknown>|n/a)')
$diagA  = Grab @('Diag\s+echo\s+A\s+code\s*[:=]\s*([0-9]{1,3}|<unknown>|n/a)')
$variant= Grab @('import-prices\s+Variant\s*[:=]\s*([^\r\n]+)')
$final  = Grab @('import-prices\s+Final\s+code\s*[:=]\s*([0-9]{1,3}|<unknown>|n/a)')
$pubH   = Grab @('Publishable\s+hash8\s*[:=]\s*([a-f0-9]{8}|<missing>)')

# Print the requested 6-line probe summary exactly
Write-Output ("URL: " + $FnUrl)
Write-Output ("Method: POST")
Write-Output ("Status: " + $Status)
Write-Output ("GatewayAuth: " + $GatewayAuth)
Write-Output ("BridgeTokenHash8: " + $bri8)
if ($BodyPreview -and $BodyPreview.Length -gt 300) { $BodyPreview = $BodyPreview.Substring(0,300) }
Write-Output ("Body[0..300]: " + ($BodyPreview ?? '<empty>'))

Write-Host "`n--- Function Gate Snapshot ---"
Write-Host ("header8 (request): " + $header8)
Write-Host ("env8    (runtime): " + $env8)
Write-Host ("expected (input) : " + $bri8)
Write-Host ("Fn logs -> " + $FnLog)

Write-Host "`n--- CI Six-Line Summary ---"
Write-Host ("Diag echo B code: " + $diagB)
Write-Host ("Diag echo A code: " + $diagA)
Write-Host ("import-prices Variant: " + $variant)
Write-Host ("import-prices Final code: " + $final)
Write-Host ("Publishable hash8: " + $pubH)
Write-Host ("Bridge hash8: " + $bri8)
Write-Host ("CI logs -> " + $CiLog)
Write-Host "-----------------------------"
