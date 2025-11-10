Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-Location (Split-Path -Parent $PSCommandPath)
Set-Location ..

$ProjRef = "ycdxbpibncqcchqiihfz"
$FUNCS  = "https://$ProjRef.functions.supabase.co"
$Report = "reports"; New-Item -ItemType Directory -Force -Path $Report | Out-Null
$FnLog  = Join-Path $Report "import_prices_fn_logs.txt"

# --- 1) Securely read session-only secrets (no persistence, no echo)
function Read-Plain([string]$prompt) {
  $s = Read-Host -AsSecureString $prompt
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

# Allow env fallback to support non-interactive usage
$PUB = $env:SUPABASE_PUBLISHABLE_KEY
if (-not $PUB) { $PUB = Read-Plain "Paste SUPABASE_PUBLISHABLE_KEY (anon JWT) – will not be printed" }
$BRI = $env:BRIDGE_IMPORT_TOKEN
if (-not $BRI) { $BRI = Read-Plain "Paste BRIDGE_IMPORT_TOKEN – will not be printed" }

if ([string]::IsNullOrWhiteSpace($PUB)) { throw "Publishable key required." }
if ([string]::IsNullOrWhiteSpace($BRI)) { throw "Bridge token required." }

# --- 2) Helpers
function Hash8([string]$s){
  if([string]::IsNullOrWhiteSpace($s)){return "<missing>"}
  $d=[Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($s))
  (-join ($d|ForEach-Object {$_.ToString("x2")})).Substring(0,8)
}
function Probe($method,$url,$headers,$body=$null){
  try {
    if ($body -ne $null) {
      (Invoke-WebRequest -Method $method -Uri $url -Headers $headers -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 30).StatusCode
    } else {
      (Invoke-WebRequest -Method $method -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 30).StatusCode
    }
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__) { $_.Exception.Response.StatusCode.value__ } else { "<unknown>" }
  }
}

$pub8 = Hash8 $PUB
$bri8 = Hash8 $BRI

# --- 3) Build headers (REAL bearer on functions domain) and probe
$H = New-Object "System.Collections.Generic.Dictionary[[String],[String]]"
$H["Authorization"]  = "Bearer $PUB"
$H["apikey"]         = $PUB

$diag = Probe "GET" "$FUNCS/diag-echo" $H

$H2 = New-Object "System.Collections.Generic.Dictionary[[String],[String]]"
$H2["Authorization"]  = "Bearer $PUB"
$H2["apikey"]         = $PUB
$H2["x-bridge-token"] = $BRI
$H2["X-Bridge-Token"] = $BRI
$body = @{ ping = "diag" } | ConvertTo-Json
$imp  = Probe "POST" "$FUNCS/import-prices" $H2 $body

# --- 4) Pull function logs and extract token.check header8/env8 if present
(supabase functions logs -f import-prices --project-ref $ProjRef 2>&1) | Set-Content $FnLog -Encoding utf8
$m = Select-String -Path $FnLog -Pattern '\[IMPORT-PRICES\]\s+token\.check\s+header8=(\w+)\s+env8=(\w+)' -AllMatches |
     Select-Object -Expand Matches | Select-Object -Last 1
$hdr8 = if ($m) { $m.Groups[1].Value } else { "<none>" }
$env8 = if ($m) { $m.Groups[2].Value } else { "<none>" }

# --- 5) Print concise verdict
"`n--- Probes (functions domain) ---"
"diag-echo (GET)        : $diag"
"import-prices (POST)   : $imp"
"`n--- Token hash8s ---"
"publishable (input)    : $pub8"
"bridge (input)         : $bri8"
"`n--- Function gate snapshot (from logs) ---"
"header8 (request)      : $hdr8"
"env8    (runtime)      : $env8"
"logs path              : $FnLog"

if ($diag -eq 200) {
  "Diag OK: functions gateway accepted the real bearer."
} elseif ($diag -eq 401) {
  "Diag FAIL: bearer rejected on functions domain — anon key may be wrong/stale."
} else {
  "Diag status: $diag"
}

if ($imp -eq 200) {
  "Import-Prices OK: token matched (gate passed)."
} elseif ($imp -eq 401) {
  "Import-Prices 401: gate rejected — check header8/env8 above."
} else {
  "Import-Prices status: $imp"
}

# Cleanup sensitive vars in memory
Remove-Variable PUB,BRI -ErrorAction SilentlyContinue

