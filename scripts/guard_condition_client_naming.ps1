# Guard: Condition client naming must remain canonical
# Fails if invented or stale symbols reappear in backend code.
# Zero runtime impact. Static analysis only.

$ErrorActionPreference = "Stop"

# Symbols that must NEVER appear again
$forbidden = @(
  "detectAndWarpCard",
  "warpCard",
  "warp_client",
  "ai_warp_client"
)

$hits = @()

foreach ($term in $forbidden) {
  $results = Select-String -Path "backend" -Pattern $term -SimpleMatch
  if ($results) {
    $hits += $results
  }
}

if ($hits.Count -gt 0) {
  Write-Host "❌ Condition client naming violation detected:"
  $hits | ForEach-Object {
    Write-Host " - $($_.Path):$($_.LineNumber) → $($_.Line.Trim())"
  }
  exit 1
}

Write-Host "✅ Condition client naming guard passed."
exit 0
