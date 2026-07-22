Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Push-Location "C:\grookai_vault"

function Get-LastHeader {
  param([string]$Text,[string]$Prefix)
  $idx = $Text.LastIndexOf($Prefix)
  if ($idx -lt 0) { return $null }
  $after = $Text.Substring($idx)
  ($after -split "(`r`n|`n)")[0]  # first line only
}

$queue = ".codex\queue.md"
$lastTask = $null
$lastDone = $null
if (Test-Path $queue) {
  $q = Get-Content $queue -Raw
  $lastTask = Get-LastHeader -Text $q -Prefix "### TASK:"
  $lastDone = Get-LastHeader -Text $q -Prefix "### DONE:"
}

# Git info (safe/read-only)
$branch = (git rev-parse --abbrev-ref HEAD) 2>$null
$commit = (git log -1 --pretty="%h %ad — %s" --date=iso) 2>$null
$dirty  = (git status --porcelain) 2>$null

# Pretty print
"===== BRIDGE STATUS ====="
"Queue file: $queue"
"Last TASK: " + ($(if ($lastTask) { $lastTask } else { "(none found)" }))
"Last DONE: " + ($(if ($lastDone) { $lastDone } else { "(none found)" }))
""
"Git:"
"  Branch: " + ($(if ($branch) { $branch } else { "(unknown)" }))
"  Last commit: " + ($(if ($commit) { $commit } else { "(no commits?)" }))
"  Working tree: " + ($(if ($dirty) { "changes present" } else { "clean" }))
if ($dirty) {
  ""
  "Uncommitted changes:"
  $dirty
}
""
"Hints:"
"- Add a new task at the bottom of .codex/queue.md (### TASK: …)."
"- Dispatch with your bridge or mark the last block as ### DONE: when finished."
""
"BRIDGE_STATUS_OK"

Pop-Location


function Invoke-GVImportPricesProbe {
  [CmdletBinding()]
  param()
  Set-StrictMode -Version Latest
  $ErrorActionPreference = "Stop"

  if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_PUBLISHABLE_KEY) {
    return [pscustomobject]@{ Name='import-prices'; Method='POST'; Auth='publishable'; Code=-1; Ok=$false; Note='Missing required env' }
  }

  $url = "$(($env:SUPABASE_URL.TrimEnd('/')))/functions/v1/import-prices"
  $body = @{ mode = 'health'; source = 'bridge-status-health' } | ConvertTo-Json -Depth 5

  $headers = @{
    "apikey"       = $env:SUPABASE_PUBLISHABLE_KEY
    "Content-Type" = "application/json"
  }

  try {
    $r = Invoke-WebRequest -Method POST -Uri $url -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 8
    $json = $r.Content | ConvertFrom-Json
    $ok = ([int]$r.StatusCode -eq 200 -and $json.ok -eq $true -and $json.mode -eq 'health' -and $json.pipeline -eq 'retired')
    return [pscustomobject]@{ Name='import-prices'; Method='POST'; Auth='publishable'; Code=[int]$r.StatusCode; Ok=$ok; Note='retired-health' }
  } catch {
    $code = try { $_.Exception.Response.StatusCode.value__ } catch { -1 }
    return [pscustomobject]@{ Name='import-prices'; Method='POST'; Auth='publishable'; Code=[int]$code; Ok=$false; Note='retired-health' }
  }
}

$probe = Invoke-GVImportPricesProbe
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outDir = "reports"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$reportPath = Join-Path $outDir "import_prices_token_sync_$stamp.txt"
"NAME, METHOD, AUTH, CODE, OK, VARIANT" | Out-File -FilePath $reportPath -Encoding utf8
"$($probe.Name), $($probe.Method), $($probe.Auth), $($probe.Code), $($probe.Ok), $($probe.Note)" | Out-File -FilePath $reportPath -Append -Encoding utf8
Write-Host "[Bridge] import-prices -> Code=$($probe.Code) Ok=$($probe.Ok) Variant=$($probe.Note)  Report=$reportPath"
