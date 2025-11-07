param()
$ErrorActionPreference='Stop'

function Root { (git rev-parse --show-toplevel) }
Set-Location (Root)

$outDir = "scripts/diagnostics/output"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$report = Join-Path $outDir "rls_probe.md"

function Load-DotEnv { $m=@{}; if(Test-Path '.env'){ Get-Content .env | ?{ $_ -match '=' -and -not $_.Trim().StartsWith('#') } | % { $p=$_.Split('=',2); if($p.Length -eq 2){ $m[$p[0].Trim()]=$p[1].Trim() } } }; return $m }
function Redact([string]$s){ if(-not $s){return $s}; $r=[regex]::Replace($s, '://([^:@]+):([^@]+)@', '://$1:***@'); return $r }

$envMap = Load-DotEnv
$base = $envMap['SUPABASE_URL']
$anon = $envMap['SUPABASE_ANON_KEY']
$userJwt = $envMap['TEST_USER_JWT']
if (-not $base -or -not $anon) { Write-Host "Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env" -ForegroundColor Yellow; exit 1 }

function Get-Json($url,$hdr,$method='GET',$body=$null){ try { if($body){ return Invoke-WebRequest -UseBasicParsing -Uri $url -Headers $hdr -Method $method -ContentType 'application/json' -Body ($body|ConvertTo-Json) } else { return Invoke-WebRequest -UseBasicParsing -Uri $url -Headers $hdr -Method $method } } catch { return $_.Exception.Response } }

$lines=@()
$lines += "# RLS Probe"
$lines += ("_Generated: {0}_" -f (Get-Date))

function Probe($label,$path,$method='GET',$body=$null){
  $hdrAnon = @{ apiKey=$anon; Authorization="Bearer $anon" }
  $respAnon = Get-Json ("$base$path") $hdrAnon $method $body
  $codeAnon = if ($respAnon -and $respAnon.StatusCode) { [int]$respAnon.StatusCode } else { 200 }
  $lines += ("- {0} (anon): HTTP {1}" -f $label, $codeAnon)
  if ($userJwt) {
    $hdrUser = @{ apiKey=$anon; Authorization="Bearer $userJwt" }
    $respUser = Get-Json ("$base$path") $hdrUser $method $body
    $codeUser = if ($respUser -and $respUser.StatusCode) { [int]$respUser.StatusCode } else { 200 }
    $lines += ("- {0} (user): HTTP {1}" -f $label, $codeUser)
  }
  return $codeAnon
}

$ok=true
$ok = ($ok -and (Probe 'wall_feed_v' '/rest/v1/wall_feed_v?select=*&limit=1') -eq 200)
$ok = ($ok -and (Probe 'wall_feed_list' '/rest/v1/rpc/wall_feed_list' 'POST' @{ _limit=1; _offset=0 }) -eq 200)
# Expect base tables blocked for anon: allow 403/404
$code = Probe 'listings (base table)' '/rest/v1/listings?select=id&limit=1'
if ($code -eq 200) { $ok=$false; $lines += "  - EXPECTED block for anon, but got 200" }

Set-Content -Path $report -Value ($lines -join "`n")
if ($ok) { exit 0 } else { exit 2 }

