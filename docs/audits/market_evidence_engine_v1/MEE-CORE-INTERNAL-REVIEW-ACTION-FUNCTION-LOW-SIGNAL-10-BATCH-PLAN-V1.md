# MEE Core Internal Review Action Function Low Signal 10 Batch Plan V1

Generated: 2026-06-27T00:37:44.040Z

Mode: plan only, local artifacts only

## Batch

- Size: 10
- Lane: `low_signal_monitor`
- Action: `confirm_monitor_only`
- Actor: `system_low_signal_10_batch_plan`

## Targets

- 1. `GV-PK-TK-tk-bw-e-20` / `00b58c53-3228-4bfd-a55b-2c16ec1be124`
- 2. `GV-PK-TK-tk-bw-z-2` / `01296bdf-16f7-4e2d-839b-a110993ca257`
- 3. `GV-PK-MEP-002` / `022501fd-56d0-4873-8ed4-e66a9ee404bd`
- 4. `GV-PK-BWP-40-STAFF-STAMP` / `0251b0b3-1bf9-4020-90ec-bafd66c95ef4`
- 5. `GV-PK-WCD-2018-DRAGONES_Y_SOMBRAS-21-ENERGY-21-LIGHTNING_ENERGY` / `03d769b0-1fa7-4b34-be98-5fa4db2e766a`
- 6. `GV-PK-WCD-2007-FLYVEES-05-EX_DELTA_SPECIES-109-JOLTEON_EX` / `0450f3e0-ffb3-47e2-959c-066ef72cd1f5`
- 7. `GV-PK-TK-tk-bw-z-13` / `0489c268-59ae-472d-97a9-17fc3983deac`
- 8. `GV-PK-WCD-2004-ROCKY_BEACH-05-EX_TEAM_MAGMA_VS-94-SUICUNE_EX` / `04f4b24b-c685-4451-9206-5aed2c6eafae`
- 9. `GV-PK-MCD-2014-3` / `05b52775-4f83-45c8-a6bc-eacdaa03b3e2`
- 10. `GV-PK-MEP-004-STAFF-STAMP` / `06009615-630b-4ac4-947f-6be2e8db0e3f`

## Hashes

- Row manifest: `14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2`
- Apply SQL: `1eefbfe74b8f9bfb50cb000ac0e042e6b139a140d4ecad217bbb53e3ac5dd610`
- Rollback SQL: `19283c6b959bc698a2598e8385db035fd6a3cdc8b67e5ca536cd9b810805be5a`
- Readback SQL: `41594bcaf2bde646d9662b2f5d08741d338e0b5231af3f56fdbb5ad75ee287c6`
- Preflight SQL: `405da27a1e216c9b7dbc8b3615d7f90c52131c24f634e55e564dd77a10facb3e`

## Boundary

No DB writes, function invocation, action event inserts, disposition updates, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, executed deletes, upserts, merges, migrations, or global apply.
