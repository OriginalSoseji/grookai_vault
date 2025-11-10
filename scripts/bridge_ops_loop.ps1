# Bridge: Daily Ops Loop
Write-Host "=== Bridge Daily Ops Loop ===" -ForegroundColor Cyan

./scripts/bridge_task_prod_dump.ps1
./scripts/bridge_task_wall_feed_health.ps1
./scripts/bridge_task_import_prices.ps1

Write-Host "=== End Bridge Ops Loop ===" -ForegroundColor Cyan
./scripts/bridge_task_struct_verify.ps1
