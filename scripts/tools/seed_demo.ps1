param()
$ErrorActionPreference='Stop'

function Root { (git rev-parse --show-toplevel) }
Set-Location (Root)

if ($env:DEMO_SEED -ne 'true') { Write-Host 'DEMO_SEED not true; skipping.'; exit 0 }

function Load-DotEnv { $m=@{}; if(Test-Path '.env'){ Get-Content .env | ?{ $_ -match '=' -and -not $_.Trim().StartsWith('#') } | % { $p=$_.Split('=',2); if($p.Length -eq 2){ $m[$p[0].Trim()]=$p[1].Trim() } } }; return $m }
function Redact([string]$s){ if(-not $s){return $s}; $r=[regex]::Replace($s, '://([^:@]+):([^@]+)@', '://$1:***@'); return $r }

$envMap = Load-DotEnv
$base = $envMap['SUPABASE_URL']
$srk = $env:SUPABASE_SECRET_KEY; if(-not $srk){ $srk = $env:SERVICE_ROLE_KEY }; if(-not $srk){ $srk = $envMap['SUPABASE_SECRET_KEY'] }; if(-not $srk){ $srk = $envMap['SUPABASE_SERVICE_ROLE_KEY'] }
if (-not $base -or -not $srk) { Write-Host 'Missing SUPABASE_URL or SERVICE_ROLE_KEY in env'; exit 1 }

$outDir = "scripts/diagnostics/output"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$log = Join-Path $outDir ("seed_demo_" + (Get-Date).ToString('yyyyMMdd_HHmmss') + ".log")

function Rest($path,$method='GET',$body=$null,$headers=@{}){
  $u = "$base$path"
  $hdr = @{ 'apikey'=$srk; 'Content-Type'='application/json' }
  foreach($k in $headers.Keys){ $hdr[$k]=$headers[$k] }
  try {
    if ($body){ return Invoke-WebRequest -UseBasicParsing -Method $method -Uri $u -Headers $hdr -Body ($body|ConvertTo-Json -Depth 6) }
    else { return Invoke-WebRequest -UseBasicParsing -Method $method -Uri $u -Headers $hdr }
  } catch { Add-Content -Path $log -Value (Redact($_.ToString())); return $null }
}

Add-Content -Path $log -Value ("Seeding demo dataset @ " + (Get-Date))

# Seed wall listings/photos (20)
$thumbs = @('https://picsum.photos/seed/a/300/300','https://picsum.photos/seed/b/300/300','https://picsum.photos/seed/c/300/300','https://picsum.photos/seed/d/300/300')
for($i=1;$i -le 20;$i++){
  $id = [Guid]::ParseExact(("00000000-0000-0000-0000-" + $i.ToString("D12")),'D') | Out-Null
  $lid = ("00000000-0000-0000-0000-" + $i.ToString("D12"))
  $title = "Demo Listing #$i"
  try {
    Rest "/rest/v1/listings?on_conflict=id" 'POST' @{ id=$lid; title=$title; created_at=(Get-Date).ToString('s'); is_active=$true } @{ 'Prefer'='resolution=merge-duplicates' } | Out-Null
    $t = $thumbs[($i % $thumbs.Count)]
    Rest "/rest/v1/listing_photos?on_conflict=listing_id" 'POST' @{ listing_id=$lid; thumb_url=$t; is_primary=$true } @{ 'Prefer'='resolution=merge-duplicates' } | Out-Null
  } catch { Add-Content -Path $log -Value ("listing error: " + $_.Exception.Message) }
}

# Seed pricing health row (approx now)
try { Rest "/rest/v1/pricing_health?on_conflict=observed_at" 'POST' @{ observed_at=(Get-Date).ToString('s'); mv_rows=100; jobs_24h=50 } @{ 'Prefer'='resolution=merge-duplicates' } | Out-Null } catch {}

Add-Content -Path $log -Value 'Done.'
exit 0
