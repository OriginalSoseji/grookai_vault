<#
Test import-prices health probe using standardized auth headers

Reads from environment:
  - SUPABASE_URL              (e.g., https://<ref>.supabase.co)
  - SUPABASE_PUBLISHABLE_KEY  (publishable key)
  - ACCESS_JWT                (user-provided JWT; do not mint here)
  - BRIDGE_IMPORT_TOKEN       (bridge token secret)
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function RequireVar([string]$name) {
  $v = (Get-Item -Path env:$name -ErrorAction SilentlyContinue).Value
  if ([string]::IsNullOrWhiteSpace($v)) { throw "Missing env: $name" }
  return $v
}

$base  = RequireVar 'SUPABASE_URL'
$pub   = RequireVar 'SUPABASE_PUBLISHABLE_KEY'
$jwt   = RequireVar 'ACCESS_JWT'
$bridge= RequireVar 'BRIDGE_IMPORT_TOKEN'

$url = "$($base.TrimEnd('/'))/functions/v1/import-prices"
$body = @{ ping = 1; source = 'bridge_health' } | ConvertTo-Json -Depth 3

$headers = @{
  'apikey'         = $pub
  'Authorization'  = "Bearer $jwt"
  'x-bridge-token' = $bridge
  'Content-Type'   = 'application/json'
}

try {
  $resp = Invoke-WebRequest -Method POST -Uri $url -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 30
  Write-Host ("HTTP " + [int]$resp.StatusCode)
  Write-Host ($resp.Content)
} catch {
  $r = $_.Exception.Response
  if ($r) {
    $code = [int]$r.StatusCode.value__
    $reader = New-Object IO.StreamReader($r.GetResponseStream())
    $txt = $reader.ReadToEnd()
    Write-Host ("HTTP " + $code)
    Write-Host $txt
  } else {
    throw
  }
}

