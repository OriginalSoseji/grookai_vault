Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-Location (Split-Path -Parent $PSCommandPath)
Set-Location ..

$Owner   = "OriginalSoseji"
$Repo    = "grookai_vault"
$Ref     = "main"
$ProjRef = "ycdxbpibncqcchqiihfz"
$BASE    = "https://$ProjRef.supabase.co"
$FUNCS   = "$BASE/functions/v1"
$Report  = "reports"; New-Item -ItemType Directory -Force -Path $Report | Out-Null
$OutDir  = Join-Path $Report "ci_logs"; New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$CiLog   = Join-Path $Report "ci_import_prices_latest.log"
$FnLog   = Join-Path $Report "import_prices_fn_logs.txt"
$WfPath  = ".github/workflows/prod-import-prices-validate-pub.yml"

function Hash8([string]$s){ if([string]::IsNullOrWhiteSpace($s)){return "<missing>"}; $sha=[Security.Cryptography.SHA256]::Create(); $b=[Text.Encoding]::UTF8.GetBytes($s); $h=$sha.ComputeHash($b); (-join ($h | ForEach-Object { $_.ToString('x2') })).Substring(0,8) }
function Read-Plain([string]$p){ $s = Read-Host -AsSecureString $p; $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }
function Probe($method,$url,$headers,$body=$null){ try { if ($body -ne $null) { (Invoke-WebRequest -Method $method -Uri $url -Headers $headers -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 30).StatusCode } else { (Invoke-WebRequest -Method $method -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 30).StatusCode } } catch { if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__) { $_.Exception.Response.StatusCode.value__ } else { "<unknown>" } } }

# 1) Load current secrets (prompt if needed)
$PUB = $env:SUPABASE_PUBLISHABLE_KEY; if (-not $PUB) { $PUB = Read-Plain "Paste PROD_PUBLISHABLE_KEY (sb_publishable_… or JWT)" }
$BRI = $env:BRIDGE_IMPORT_TOKEN;      if (-not $BRI) { $BRI = Read-Plain "Paste BRIDGE_IMPORT_TOKEN" }
if ([string]::IsNullOrWhiteSpace($PUB)) { throw "Publishable key required." }
if ([string]::IsNullOrWhiteSpace($BRI)) { throw "Bridge token required." }

$pub8 = Hash8 $PUB; $bri8 = Hash8 $BRI
Write-Host "`n== SEEN KEYS (hash8) ==" -ForegroundColor Cyan
Write-Host ("publishable: " + $pub8)
Write-Host ("bridge     : " + $bri8)

# 2) Prove publishable belongs to this project (/rest/v1 -> 200)
$Hrest = @{ Authorization = "Bearer $PUB"; apikey = $PUB }
$restRoot = Probe "GET" "$BASE/rest/v1/" $Hrest
Write-Host ("REST /rest/v1/ with publishable -> " + $restRoot)
if ($restRoot -ne 200) {
  Write-Warning "Publishable key may not be accepted at /rest/v1 (expected 200). Proceeding to functions probe."
  if ($env:NONINTERACTIVE -ne '1') {
    try {
      $PUB = Read-Plain "RE-ENTER the REAL project anon/public key (JWT OR sb_publishable_ from this project)"
      if ([string]::IsNullOrWhiteSpace($PUB)) { throw "Publishable key required." }
      $pub8 = Hash8 $PUB
      gh secret set PROD_PUBLISHABLE_KEY --repo $Owner/$Repo --body "$PUB" | Out-Null
      $Hrest = @{ Authorization = "Bearer $PUB"; apikey = $PUB }
      $restRoot = Probe "GET" "$BASE/rest/v1/" $Hrest
      Write-Host ("Re-check REST /rest/v1/ -> " + $restRoot + " (publishable " + $pub8 + ")")
    } catch {}
  }
}

# 3) Probe functions via REST proxy
$diag = Probe "GET" "$FUNCS/diag-echo" $Hrest
Write-Host ("Functions diag-echo -> " + $diag)

$Hedge = New-Object "System.Collections.Generic.Dictionary[[String],[String]]"
$Hedge["Authorization"]  = "Bearer $PUB"
$Hedge["apikey"]         = $PUB
$Hedge["x-bridge-token"] = $BRI
$Hedge["X-Bridge-Token"] = $BRI
$body = @{ ping = "diag" } | ConvertTo-Json
$imp  = Probe "POST" "$FUNCS/import-prices" $Hedge $body
Write-Host ("Functions import-prices -> " + $imp)

# 4) If 401, sync bridge across GH + Supabase and redeploy
if ($imp -eq 401) {
  Write-Warning "import-prices 401 — syncing bridge token to GH+Supabase and redeploying function."
  gh secret set BRIDGE_IMPORT_TOKEN --repo $Owner/$Repo --body "$BRI" | Out-Null
  try { supabase functions secrets set import-prices BRIDGE_IMPORT_TOKEN="$BRI" --project-ref $ProjRef | Out-Null } catch { supabase secrets set BRIDGE_IMPORT_TOKEN="$BRI" --project-ref $ProjRef | Out-Null }
  supabase functions deploy import-prices --project-ref $ProjRef --no-verify-jwt | Out-Null
  Start-Sleep -Seconds 3
  $imp = Probe "POST" "$FUNCS/import-prices" $Hedge $body
  Write-Host ("Functions import-prices (after sync) -> " + $imp)
}

# Pull function logs and extract header8/env8
(supabase functions logs -f import-prices --project-ref $ProjRef 2>&1) | Set-Content $FnLog -Encoding utf8
$m = Select-String -Path $FnLog -Pattern '\[IMPORT-PRICES\]\s+token\.check\s+header8=(\w+)\s+env8=(\w+)' -AllMatches | Select-Object -Expand Matches | Select-Object -Last 1
$hdr8 = if ($m) { $m.Groups[1].Value } else { '<none>' }
$env8 = if ($m) { $m.Groups[2].Value } else { '<none>' }
Write-Host "`n== Function snapshot =="
Write-Host ("header8: " + $hdr8)
Write-Host ("env8   : " + $env8)
Write-Host ("logs   : " + $FnLog)

if ($diag -ne 200 -or $imp -ne 200) { throw ("Probes not green. diag=" + $diag + " import=" + $imp + " (publishable " + $pub8 + ", bridge " + $bri8 + ", env8 " + $env8 + ")") }

# 5) Dispatch validator, wait, then fetch logs ZIP (with retries)
try { gh workflow run $WfPath -r $Ref | Out-Null } catch {}
Start-Sleep -Seconds 4
$run = gh run list --workflow $WfPath --json databaseId,headBranch,createdAt,status,conclusion,url --limit 10 | ConvertFrom-Json | Where-Object { $_.headBranch -eq $Ref } | Sort-Object createdAt -Descending | Select-Object -First 1
if (-not $run) { throw 'No run found after dispatch.' }
$runId = $run.databaseId; $runURL=$run.url
try { gh run watch $runId | Out-Null } catch {}

$zip = Join-Path $OutDir ("run_${runId}_logs.zip")
$tok = (gh auth token).Trim(); $headers = @{ Authorization = "Bearer $tok"; 'User-Agent'='gh-cli'; Accept='application/zip' }
$ok=$false
for ($i=1; $i -le 8; $i++){
  try { Invoke-WebRequest -Method GET -Uri "https://api.github.com/repos/$Owner/$Repo/actions/runs/$runId/logs" -Headers $headers -OutFile $zip -UseBasicParsing -TimeoutSec 60; if (Test-Path $zip -and (Get-Item $zip).Length -gt 0) { $ok=$true; break } } catch { Start-Sleep -Seconds (2*$i) }
  Start-Sleep -Seconds (2 + 2*$i)
}
if (-not $ok) { throw ("Logs zip not available for run " + $runId) }
$extractDir = Join-Path $OutDir ("run_${runId}")
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
Expand-Archive -LiteralPath $zip -DestinationPath $extractDir
$allTxt = Join-Path $extractDir 'ALL.txt'
$files = Get-ChildItem -Path $extractDir -Recurse -File | Where-Object { $_.Extension -in '.txt','.log' } | Sort-Object FullName
if ($files){ Get-Content -LiteralPath $files.FullName -Raw | Set-Content -Path $allTxt -Encoding UTF8 } else { '' | Set-Content -Path $allTxt -Encoding UTF8 }
Copy-Item $allTxt $CiLog -Force

# 6) Parse six-line summary
$log = Get-Content $allTxt -Raw
function Grab($pats){ foreach($p in $pats){ $m=[regex]::Match($log,$p,'IgnoreCase,Multiline'); if($m.Success){ return $m.Groups[1].Value.Trim() } } return '<not found>' }
$b  = Grab @('Diag\s+echo\s+B\s+code\s*[:=]\s*([0-9]{3}|<unknown>)')
$a  = Grab @('Diag\s+echo\s+A\s+code\s*[:=]\s*([0-9]{3}|<unknown>)')
$vr = Grab @('import-prices\s+Variant\s*[:=]\s*([^\r\n]+)')
$fc = Grab @('import-prices\s+Final\s+code\s*[:=]\s*([0-9]{3}|<unknown>)')
$ph = Grab @('Publishable\s+hash8\s*[:=]\s*([a-f0-9]{8}|<missing>)')
$bh = Grab @('Bridge\s+hash8\s*[:=]\s*([a-f0-9]{8}|<missing>)')
Write-Output "--- CI Six-Line Summary ---"
Write-Output ("Diag echo B code: $b")
Write-Output ("Diag echo A code: $a")
Write-Output ("import-prices Variant: $vr")
Write-Output ("import-prices Final code: $fc")
Write-Output ("Publishable hash8: $ph")
Write-Output ("Bridge hash8: $bh")
Write-Output ("Run URL: $runURL")
Write-Output ("Logs dir: $extractDir")
Write-Output "-----------------------------"
