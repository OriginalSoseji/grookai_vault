# Global Naming Invariants Guard
# Fails if invented, drifted, or non-canonical symbols appear in backend code.
# Static analysis only. Zero runtime impact.

$ErrorActionPreference = "Stop"

# List of forbidden naming patterns (extend over time)
$forbidden = @(
  # Generic AI-invented helpers
  "detectAndWarpCard",
  "warpCard",
  "warp_client",
  "ai_warp_client",

  # Semantic aliases that hide real exports
  "getOrCreate",
  "maybe",
  "tryDetect",
  "smart",

  # Placeholder / speculative names
  "temp",
  "tmp_",
  "hack",
  "quickFix",
  "workaround"
)

# Paths to enforce (backend + workers + scripts)
$paths = @(
  "backend",
  "scripts"
)

$hits = @()

foreach ($path in $paths) {
  foreach ($term in $forbidden) {
    $results = Select-String -Path $path -Pattern $term -SimpleMatch -ErrorAction SilentlyContinue
    if ($results) {
      $hits += $results
    }
  }
}

if ($hits.Count -gt 0) {
  Write-Host "❌ Global naming invariant violation detected:"
  $hits | ForEach-Object {
    Write-Host " - $($_.Path):$($_.LineNumber) → $($_.Line.Trim())"
  }
  exit 1
}

Write-Host "✅ Global naming invariants guard passed."
exit 0
