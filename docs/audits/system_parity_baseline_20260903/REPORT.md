# System Parity Crawl V1

- Capture kind: `baseline`
- Authority: `origin/main`
- Authority SHA: `9a6f62c077f02528ecb26ee7d660f501476475a6`
- Branch: `ops/system-parity-baseline-v1`
- Producer SHA: `311dc50481714aee580f13daae75d3c70c2d1253`
- Boundary: read-only external systems; local audit artifacts only

## Capture

- Tracked files: 21414
- Migrations: 382
- Workflows: 58
- Web routes: 95
- Entrypoints: 160
- Database required-query failures: 0
- Product cases: 14
- Product capture failures: 0
- Runtime capture errors: 0

## Invariants

- No database writes, auth-user creation, Storage writes, deployments, approvals, or publication changes were authorized or performed.
- Repository inventory was read from the recorded authority ref, not inferred from the working tree.
- Screenshots and browser navigation were signed out and GET-only.
- Secrets are excluded; only referenced environment-variable names are recorded.

