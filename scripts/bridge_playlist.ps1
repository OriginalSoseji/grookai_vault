param(
  [ValidateSet("local_only","ci_probe")]
  [string]$Mode = "local_only"
)

Set-StrictMode -Version Latest
$ErrorActionPreference="Stop"
Push-Location "C:\grookai_vault"

switch ($Mode) {
  "local_only" {
    # Example: tidy queue, mark last task DONE (no network/CI)
    $q = ".codex\queue.md"
    if (Test-Path $q) {
      $t = Get-Content $q -Raw
      $i = $t.LastIndexOf("### TASK:")
      if ($i -ge 0) {
        $after = $t.Substring($i)
        $titleEnd = $after.IndexOf("`n")
        if ($titleEnd -gt 0) {
          $newTitle = "### DONE:" + $after.Substring(10,$titleEnd-10)
          $t = $t.Substring(0,$i) + $newTitle + $after.Substring($titleEnd)
          $t | Set-Content -Path $q -Encoding UTF8
          "Marked last task as DONE."
        }
      }
    }
  }
  "ci_probe" {
    # Manual CI example (only when you add CONFIRM: YES): trigger-by-file + fetch summary
    gh auth status | Out-Null
    $wfFile = ".github/workflows/prod-edge-probe.yml"
    if (-not (Test-Path $wfFile)) { throw "Missing $wfFile" }
    $def = (gh repo view --json defaultBranchRef | ConvertFrom-Json).defaultBranchRef.name
    if (-not $def) { $def = "main" }

    gh workflow run $wfFile --ref $def | Out-Null
    Start-Sleep 3
    $id = (gh run list --workflow $wfFile --limit 1 --json databaseId | ConvertFrom-Json)[0].databaseId
    gh run watch $id --exit-status

    $dest="reports\latest_probe_artifacts"
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    gh run download $id -n prod-edge-probe -D $dest 2>$null
    $sum = Get-ChildItem $dest -Recurse -Filter SUMMARY.md | Select-Object -First 1
    if ($sum) { Get-Content $sum.FullName } else { "No SUMMARY.md artifact found." }
  }
}

Pop-Location
