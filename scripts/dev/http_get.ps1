param(
  [Parameter(Mandatory=$true)][string]$Url
)

$ErrorActionPreference = 'Stop'

$headers = @{}
if ($env:SUPABASE_ANON_KEY) {
  $headers['apikey'] = $env:SUPABASE_ANON_KEY
  $headers['Authorization'] = "Bearer $env:SUPABASE_ANON_KEY"
}

try {
  $r = Invoke-RestMethod -Method Get -Uri $Url -Headers $headers -TimeoutSec 10
  $json = $r | ConvertTo-Json -Depth 5
  Write-Output $json
  if ($r -is [array]) {
    if ($r.Length -lt 1) { exit 1 } else { exit 0 }
  } else {
    exit 0
  }
} catch {
  Write-Error $_.Exception.Message
  exit 1
}

