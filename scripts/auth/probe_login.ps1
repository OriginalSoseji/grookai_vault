param(
  [ValidateSet('local','staging')]
  [string]$Env = 'local',
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = 'Stop'

function Read-DotEnvFile([string]$path){
  if (!(Test-Path $path)) { throw "Env file not found: $path" }
  $vars = @{}
  Get-Content $path | ForEach-Object {
    if ($_ -match '^[#\s]') { return }
    if ($_ -notmatch '=') { return }
    $k,$v = $_ -split '=',2
    $vars[$k.Trim()] = $v.Trim()
  }
  return $vars
}

$envPath = if ($Env -eq 'staging') { '.env.staging' } else { '.env.local' }
$vars = Read-DotEnvFile $envPath
$base = $vars['SUPABASE_URL']
$anon = $vars['SUPABASE_ANON_KEY']
if (-not $base -or -not $anon) { throw "Missing SUPABASE_URL or SUPABASE_ANON_KEY in $envPath" }

$uri = "$base/auth/v1/token?grant_type=password"
$headers = @{ apikey=$anon; 'Content-Type'='application/json' }
$body = @{ email=$Email; password=$Password } | ConvertTo-Json

try {
  $r = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body -TimeoutSec 30
  $tok = ($r.access_token ?? '')
  if ([string]::IsNullOrEmpty($tok)) { throw "No access_token returned" }
  $mask = if ($tok.Length -ge 12) { $tok.Substring(0,12) } else { $tok }
  Write-Host "OK: access_token=$mask..." -ForegroundColor Green
} catch {
  $status = try { [int]$_.Exception.Response.StatusCode } catch { 0 }
  $detail = try { $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream()); $sr.ReadToEnd() } catch { $_.Exception.Message }
  Write-Host "FAIL ($status): $detail" -ForegroundColor Red
  exit 1
}

