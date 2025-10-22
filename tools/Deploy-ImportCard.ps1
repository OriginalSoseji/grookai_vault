param(
  [string]$ProjectRoot = "C:\grookai_vault",
  [string]$SetCode = "sv4",
  [string]$Number = "12",
  [string]$Lang = "en"
)

$ErrorActionPreference = 'Continue'
Set-Location $ProjectRoot
$reports = Join-Path $ProjectRoot ".reports"
if (-not (Test-Path $reports)) { New-Item -ItemType Directory -Path $reports | Out-Null }

# Load env from function .env for secrets
$envPath = Join-Path $ProjectRoot 'supabase\functions\import-card\.env'
$SUPABASE_URL = $null
$SUPABASE_SERVICE_ROLE_KEY = $null
if (Test-Path $envPath) {
  try {
    $lines = Get-Content $envPath | Where-Object { $_ -and -not ($_ -match '^\s*#') }
    foreach ($line in $lines) {
      if ($line -match '^(?<k>[^=]+)=(?<v>.*)$') {
        $k = $Matches['k'].Trim()
        $v = $Matches['v']
        if ($k -eq 'SUPABASE_URL') { $SUPABASE_URL = $v }
        if ($k -eq 'SUPABASE_SERVICE_ROLE_KEY') { $SUPABASE_SERVICE_ROLE_KEY = $v }
      }
    }
  } catch {}
}

$secretsOut = Join-Path $reports 'remote_secrets.txt'
$deployOut  = Join-Path $reports 'remote_deploy.txt'
$invokeOut  = Join-Path $reports 'remote_invoke.txt'

"Setting remote secrets..." | Set-Content -Path $secretsOut
try {
  $sec = supabase secrets set "SUPABASE_URL=$SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY" 2>&1 | Out-String
  $sec | Add-Content -Path $secretsOut
} catch { ($_ | Out-String) | Add-Content -Path $secretsOut }

"Deploying function import-card..." | Set-Content -Path $deployOut
try {
  $dep = supabase functions deploy import-card --no-verify-jwt 2>&1 | Out-String
  $dep | Add-Content -Path $deployOut
} catch { ($_ | Out-String) | Add-Content -Path $deployOut }

"Invoking remote function import-card..." | Set-Content -Path $invokeOut
try {
  $payload = @{ set_code = $SetCode; number = $Number; lang = $Lang } | ConvertTo-Json -Compress
  $inv = supabase functions invoke import-card --no-verify-jwt --data $payload 2>&1 | Out-String
  $inv | Add-Content -Path $invokeOut
} catch { ($_ | Out-String) | Add-Content -Path $invokeOut }

Write-Host "Outputs:"
Write-Host " - $secretsOut"
Write-Host " - $deployOut"
Write-Host " - $invokeOut"
