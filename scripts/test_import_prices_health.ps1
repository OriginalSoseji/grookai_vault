<#
Read-only health probe for a retired import-prices Edge Function.

Required environment:
  - SUPABASE_URL
  - SUPABASE_PUBLISHABLE_KEY
#>

param(
  [ValidateSet('import-prices', 'import-prices-v3', 'import-prices-bridge')]
  [string]$FunctionName = 'import-prices'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Require-EnvironmentVariable([string]$Name) {
  $value = (Get-Item -Path "env:$Name" -ErrorAction SilentlyContinue).Value
  if ([string]::IsNullOrWhiteSpace($value)) { throw "Missing env: $Name" }
  return $value
}

$baseUrl = Require-EnvironmentVariable 'SUPABASE_URL'
$publishableKey = Require-EnvironmentVariable 'SUPABASE_PUBLISHABLE_KEY'
$url = "$($baseUrl.TrimEnd('/'))/functions/v1/$FunctionName"
$headers = @{
  apikey = $publishableKey
  'content-type' = 'application/json'
}
$body = @{ mode = 'health'; source = 'powershell-health' } | ConvertTo-Json

try {
  $response = Invoke-WebRequest `
    -Method POST `
    -Uri $url `
    -Headers $headers `
    -Body $body `
    -UseBasicParsing `
    -TimeoutSec 20
} catch {
  $code = try { [int]$_.Exception.Response.StatusCode.value__ } catch { -1 }
  throw "Retired $FunctionName health probe failed with HTTP $code."
}

$json = $response.Content | ConvertFrom-Json
if (
  [int]$response.StatusCode -ne 200 -or
  $json.ok -ne $true -or
  $json.mode -ne 'health' -or
  $json.pipeline -ne 'retired'
) {
  throw "Unexpected retired $FunctionName health response: $($response.Content)"
}

Write-Host "[health] PASS: $FunctionName is retired, reachable, and database-free." -ForegroundColor Green
