Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_PUBLISHABLE_KEY -or -not $env:BRIDGE_IMPORT_TOKEN) {
  throw "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY or BRIDGE_IMPORT_TOKEN"
}
$url = "$(($env:SUPABASE_URL.TrimEnd('/')))/functions/v1/import-prices"
$body = @{ ping = 'ok' } | ConvertTo-Json -Depth 5

# Variant A
$hA = @{
  "apikey"         = $env:SUPABASE_PUBLISHABLE_KEY
  "x-bridge-token" = $env:BRIDGE_IMPORT_TOKEN
  "Content-Type"   = "application/json"
}
try {
  $r = Invoke-WebRequest -Method POST -Uri $url -Headers $hA -Body $body -UseBasicParsing
  Write-Host "A -> CODE=$($r.StatusCode) (OK=$([int]$r.StatusCode -ge 200 -and [int]$r.StatusCode -lt 300))"
  exit 0
} catch {
  $code = try { $_.Exception.Response.StatusCode.value__ } catch { -1 }
  Write-Host "A -> CODE=$code"
  if ($code -ne 401) { exit 1 }
}

# Variant B
$hB = $hA.Clone()
$hB["Authorization"] = "Bearer $($env:SUPABASE_PUBLISHABLE_KEY)"  # MUST match apikey
try {
  $r = Invoke-WebRequest -Method POST -Uri $url -Headers $hB -Body $body -UseBasicParsing
  Write-Host "B -> CODE=$($r.StatusCode) (OK=$([int]$r.StatusCode -ge 200 -and [int]$r.StatusCode -lt 300))"
  exit 0
} catch {
  $code = try { $_.Exception.Response.StatusCode.value__ } catch { -1 }
  Write-Host "B -> CODE=$code"
  exit 1
}
