param(
  [Parameter(Mandatory=$true)][string]$SetId,      # e.g. "sv06"
  [int]$Per = 200,
  [int]$MaxRetries = 3
)

$ErrorActionPreference = "Stop"
$Page   = 1
$All    = @()

function Invoke-WithRetry([string]$Url) {
  for ($i=0; $i -lt $MaxRetries; $i++) {
    try   { return Invoke-RestMethod -Method GET -Uri $Url -Headers @{accept="application/json"} }
    catch {
      Start-Sleep -Seconds ([math]::Min([math]::Pow(2,$i), 8))
      if ($i -eq $MaxRetries-1) { throw }
    }
  }
}

# helper to safely fetch a property by name (case-insensitive)
function Get-Prop($obj, [string]$name) {
  $p = $obj.PSObject.Properties[$name]
  if ($p) { return $p.Value } else { return $null }
}

Write-Host "Importing set $SetId …"
while ($true) {
  $url = "https://api.tcgdex.net/v2/en/cards?set.id=eq:$SetId&pagination:page=$Page&pagination:itemsPerPage=$Per"
  $resp = Invoke-WithRetry $url
  if ($null -eq $resp) { break }
  if ($resp -isnot [System.Array]) { $resp = @($resp) }

  $count = $resp.Count
  Write-Host ("Page {0} -> {1} cards" -f $Page, $count)

  $All += $resp
  $Page++
  if ($count -lt $Per) { break }
}

Write-Host ("Total collected: {0}" -f $All.Count)

# Map API -> CSV using robust property access
$rows = foreach ($c in $All) {
  $idVal   = Get-Prop $c 'id'
  $localId = Get-Prop $c 'localId'
  $name    = Get-Prop $c 'name'
  $image   = Get-Prop $c 'image'

  $setCode = $null
  if ($idVal -is [string] -and $idVal -match '^([^-\s]+)-') { $setCode = $Matches[1] }

  [pscustomobject]@{
    set_code  = $setCode
    number    = $localId
    name      = $name
    rarity    = $null      # not present from this endpoint
    image_url = $image
  }
}

$csv = Join-Path $PWD ("cards_{0}.csv" -f $SetId)
$rows | Export-Csv -NoTypeInformation -Encoding UTF8 $csv
Write-Host "Saved: $csv"
