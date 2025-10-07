# fallback-import.ps1
# Fills missing images by querying Pokémon TCG API when TCGDex has no asset.

# -------------------------
# CONFIG (edit me)
# -------------------------
$SUPABASE_URL  = "https://ycdxbpibncqcchqiihfz.supabase.co"
$SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHhicGlibmNxY2NocWlpaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjM4NzIsImV4cCI6MjA3MTA5OTg3Mn0.3Y7KWRmroVYeyl-jhweLpkCNyE5X6yOrYR__dbalRsg"
$PTCG_API_KEY  = "1dc2c93f-b270-4fb5-ac15-239f159638c6"   # free key at pokemontcg.io
$CSV_PATH      = "C:\grookai_vault\missing_images.csv"

# Throttle: ptcg API is ~100 req/min. Stay safe.
$DelayMs = 800

# -------------------------
# Helpers
# -------------------------

function Convert-SetCodeToPTCG {
  param([string]$code)
  # Map common tricky codes → PokémonTCG v2 set.id
  $map = @{
    "sm3.5" = "sm35"        # Shining Legends
    "sm7.5" = "sm75"        # Dragon Majesty
    "smp"   = "smp"         # Sun & Moon Promos
    "ecard2"= "aquapolis"
    "ecard3"= "skyridge"
    "P"     = "basep"       # WotC Black Star Promos
    "tk"    = $null         # Trainer Kits (often no images; skip unless you want to map)
    "cel25" = "cel25"       # Celebrations
  }
  if ($map.ContainsKey($code)) { return $map[$code] }
  return $code
}

function Get-PtcgImage {
  param(
    [string]$ptcgSetId,
    [string]$number,
    [string]$name
  )
  if (-not $ptcgSetId) { return $null }

  # 1) Precise query by set.id + number
  $q = "set.id:$ptcgSetId number:`"$number`""
  $uri = "https://api.pokemontcg.io/v2/cards?q=$([uri]::EscapeDataString($q))"
  $headers = @{ "X-Api-Key" = $PTCG_API_KEY }

  try {
    $resp = Invoke-RestMethod -Method GET -Uri $uri -Headers $headers -TimeoutSec 20
    if ($resp.data -and $resp.data.Count -gt 0) {
      # Prefer exact number match; fallback to first
      $match = $resp.data | Where-Object { $_.number -eq $number } | Select-Object -First 1
      if (-not $match) { $match = $resp.data | Select-Object -First 1 }
      if ($match.images.large) { return $match.images.large }
      if ($match.images.small) { return $match.images.small }
    }
  } catch {
    return $null
  }

  # 2) Looser query by name + set (last resort)
  if ($name) {
    Start-Sleep -Milliseconds $DelayMs
    $q2 = "set.id:$ptcgSetId name:`"$name`""
    $uri2 = "https://api.pokemontcg.io/v2/cards?q=$([uri]::EscapeDataString($q2))"
    try {
      $resp2 = Invoke-RestMethod -Method GET -Uri $uri2 -Headers $headers -TimeoutSec 20
      if ($resp2.data -and $resp2.data.Count -gt 0) {
        $m2 = $resp2.data | Select-Object -First 1
        if ($m2.images.large) { return $m2.images.large }
        if ($m2.images.small) { return $m2.images.small }
      }
    } catch { return $null }
  }

  return $null
}

function Update-CardPrintFallback {
  param(
    [string]$cardId,
    [string]$imageUrl
  )
  $headers = @{
    "apikey"        = $SUPABASE_ANON
    "Authorization" = "Bearer $SUPABASE_ANON"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
  }
  $body = @{ image_alt_url = $imageUrl; image_source = "ptcg" } | ConvertTo-Json
  $uri = "$SUPABASE_URL/rest/v1/card_prints?id=eq:$cardId"
  Invoke-RestMethod -Method PATCH -Uri $uri -Headers $headers -Body $body -TimeoutSec 20 | Out-Null
}

function Log-ImageError {
  param(
    [string]$cardId, [string]$setCode, [string]$number, [string]$source, [string]$attempt, [string]$err
  )
  $headers = @{
    "apikey"        = $SUPABASE_ANON
    "Authorization" = "Bearer $SUPABASE_ANON"
    "Content-Type"  = "application/json"
  }
  $payload = @{
    card_print_id = $cardId
    set_code      = $setCode
    number        = $number
    source        = $source
    attempted_url = $attempt
    err           = $err
  } | ConvertTo-Json
  $uri = "$SUPABASE_URL/rest/v1/import_image_errors"
  try { Invoke-RestMethod -Method POST -Uri $uri -Headers $headers -Body $payload -TimeoutSec 20 | Out-Null } catch {}
}

# -------------------------
# Main
# -------------------------
if (-not (Test-Path $CSV_PATH)) {
  Write-Host "CSV not found at $CSV_PATH" -ForegroundColor Red
  exit 1
}

$rows = Import-Csv $CSV_PATH
$todo = $rows.Count
$ok = 0; $skip = 0; $fail = 0
$start = Get-Date

Write-Host "Fallback run: $todo cards from $CSV_PATH" -ForegroundColor Cyan

foreach ($row in $rows) {
  $ptcgSet = Convert-SetCodeToPTCG $row.set_code

  # Skip known-no-image families unless you want to map them later
  if (-not $ptcgSet) {
    $skip++; continue
  }

  Start-Sleep -Milliseconds $DelayMs

  $img = Get-PtcgImage -ptcgSetId $ptcgSet -number $row.number -name $row.name
  if ($img) {
    try {
      Update-CardPrintFallback -cardId $row.id -imageUrl $img
      $ok++
    } catch {
      $fail++
      Log-ImageError -cardId $row.id -setCode $row.set_code -number $row.number -source "ptcg" -attempt $img -err ($_.Exception.Message)
    }
  } else {
    $fail++
    Log-ImageError -cardId $row.id -setCode $row.set_code -number $row.number -source "ptcg" -attempt "" -err "not_found"
  }
}

$elapsed = [int]((Get-Date) - $start).TotalSeconds
Write-Host ("Done. Patched={0}  Skipped={1}  Failed={2}  in {3}s" -f $ok,$skip,$fail,$elapsed) -ForegroundColor Green
