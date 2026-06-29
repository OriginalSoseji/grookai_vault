# MEE Core Internal Review Action Function Tiny Invoke Plan V1

Generated: 2026-06-27T00:22:56.557Z

Mode: plan only, local artifacts only

## Target

- Disposition: `008c3618-9ee5-4ba0-8e60-e829d67f0002`
- Card print: `7371ad81-a1e3-4f4a-950c-1a0d20a46720`
- GVID: `GV-PK-MCD-2016-5`
- Lane: `low_signal_monitor` / `raw_single`
- Current state: `resolved` / `monitor_only`
- Action: `confirm_monitor_only`

## Hashes

- Row manifest: `7e0f32364a157e981ec5f4d31f97cb153960f069be4b9a37d226370eaa01d567`
- Apply SQL: `da4f5ed45a177da85ab073e22dc535e2be68c1ddd4ca9da3629eb8e115b54543`
- Rollback SQL: `c7bb96ca9111aa3a5bfe63b30d697b21636989a785b04f7aa1f15e54e6c1f7fa`
- Readback SQL: `b7f460d45aa1ffd9e7657a1b1ad46c7d0d3494f0ccb399af65ede7350c637200`
- Preflight SQL: `4a6c72de078c59e665d43240d669fb457dc68ac2f396bf1547b074099ddb45e2`

## Boundary

No DB writes, function invocation, action event inserts, disposition updates, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, executed deletes, upserts, merges, migrations, or global apply.
