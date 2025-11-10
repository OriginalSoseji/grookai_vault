# Bridge Task: verify structural baseline tag
Write-Host "=== Bridge Structural Baseline Check ===" -ForegroundColor Cyan
$tag = "baseline/struct-READY-2025-11-08"
try {
    $exists = git tag | Select-String -SimpleMatch $tag
    if ($exists) {
        Write-Host "[Bridge] Structural baseline verified ($tag)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Structural baseline tag missing." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Unable to verify tags: $($_.Exception.Message)" -ForegroundColor Red
}
