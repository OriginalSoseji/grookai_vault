param([int]$PerPage=200,[int]$BatchSize=500)
$ErrorActionPreference="Stop"

$Script:SUPABASE_URL = "$SUPABASE_URL"
$Script:ANON         = "$ANON"
$Script:SERVICE      = "$SERVICE"

function Get-Prop($obj,[string]$name){ $p=$obj.PSObject.Properties[$name]; if($p){$p.Value}else{$null} }

function Fetch-CardsForSet([string]$setId,[int]$perPage){
  $page=1;$all=@()
  while($true){
    $url="https://api.tcgdex.net/v2/en/cards?set.id=eq:$setId&pagination:page=$page&pagination:itemsPerPage=$perPage"
    $resp=Invoke-RestMethod -Method GET -Uri $url -Headers @{accept="application/json"}
    if($null -eq $resp){break}
    if($resp -isnot [System.Array]){$resp=@($resp)}
    $all+=$resp
    if($resp.Count -lt $perPage){break}
    $page++
  }
  ,$all
}

function Map-Rows($cards){
  foreach($c in $cards){
    $idVal=Get-Prop $c 'id'; $localId=Get-Prop $c 'localId'; $name=Get-Prop $c 'name'; $image=Get-Prop $c 'image'
    $setCode=$null; if($idVal -is [string] -and $idVal -match '^([^-\s]+)-'){ $setCode=$Matches[1] }
    [pscustomobject]@{ set_code=$setCode; number=$localId; name=$name; rarity=$null; image_url=$image }
  }
}

function Send-Batch([object[]]$items){
  if (-not $items -or $items.Count -eq 0) { Write-Host "Skip empty batch"; return }
  if ($items -isnot [System.Array]) { $items = @($items) }

  # Convert to JSON (ARRAY only)
  $json = $items | ConvertTo-Json -Depth 8
  if ($json.TrimStart().StartsWith('{')) { $json = "[$json]" }

  # Local validation (if this throws, the JSON is malformed locally)
  try { $null = $json | ConvertFrom-Json } catch {
    Write-Host "`n### LOCAL JSON PARSE FAILED ###"
    Write-Host $json
    throw
  }

  # Debug: show a short preview + total length
  $preview = $json.Substring(0, [Math]::Min(200, $json.Length))
  Write-Host ("Payload preview: {0} ... [len={1}]" -f $preview, $json.Length)

  # Send as UTF-8 BYTES (PostgREST expects clean JSON framing)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

  Invoke-RestMethod -Method POST `
    -Uri "$SUPABASE_URL/rest/v1/card_prints?on_conflict=game_id,set_code,number" `
    -Headers @{
      apikey        = $ANON
      Authorization = "Bearer $SERVICE"
      Prefer        = "resolution=merge-duplicates,return=minimal"
      Accept        = "application/json"
    } `
    -ContentType "application/json; charset=utf-8" `
    -Body $bytes | Out-Null
}


$sets = Invoke-RestMethod -Method GET -Uri "https://api.tcgdex.net/v2/en/sets" -Headers @{accept="application/json"}
if($sets -isnot [array]){ $sets=@($sets) }
Write-Host "Found $($sets.Count) sets …"

foreach($s in $sets){
  $setId=Get-Prop $s 'id'; $setName=Get-Prop $s 'name'
  if(-not $setId){ continue }
  Write-Host "`n=== Importing set $setId ($setName) ==="
  $cards=Fetch-CardsForSet -setId $setId -perPage $PerPage
  Write-Host "Collected $($cards.Count) cards …"
  $rows=@( Map-Rows $cards )
  if(-not $rows -or $rows.Count -eq 0){ Write-Host "No mapped rows — skipping."; continue }
  Write-Host ("Preview row: {0}" -f ($rows[0] | ConvertTo-Json -Depth 3))
  for($i=0; $i -lt $rows.Count; $i+=$BatchSize){
    $end=[math]::Min($i+$BatchSize-1,$rows.Count-1)
    $batch=$rows[$i..$end]
    Send-Batch $batch
    Write-Host ("Upserted {0}/{1}" -f ($end+1), $rows.Count)
  }
}
Write-Host "`nAll done."
