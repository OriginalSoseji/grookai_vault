# Grookai Dex Authenticated Smoke Gate

Generated: 2026-05-18

## Gate Status

`BLOCKED`

The remaining preview/staging enablement gate is authenticated browser smoke. The local implementation now supports the route states required for that smoke, but this session does not have a usable authenticated browser session or smoke-test credentials.

## Automated Evidence Completed

- Production enablement follow-up turns Grookai Dex on by default.
- Emergency rollback uses `GROOKAI_DEX_V1_DISABLED=true` or `NEXT_PUBLIC_GROOKAI_DEX_V1_DISABLED=true`.
- Flag off:
  - `/dex` returns 404.
  - `/dex/pikachu` returns 404.
- Flag on:
  - `/dex` renders with a bounded first page.
  - `/dex/pikachu` renders.
  - `/dex/pikachu?view=owned` renders.
  - `/dex/pikachu?view=missing` renders.
  - `/dex/charizard` renders.
- Unauthenticated flag-on routes do not expose the known-user checkpoint counts:
  - Pikachu `42/223`, `88 total copies`
  - Charizard `4/133`, `6 total copies`
- Missing-card actions route to existing canonical card pages through `/card/[gv_id]`.

## DB Checkpoint To Match During Auth Smoke

Known checkpoint user:

- `03e80d15-a2bb-4d3c-abd1-2de03e55787b`

Expected progress:

- Pikachu: `42/223` unique prints, `88` copies, `181` missing
- Charizard: `4/133` unique prints, `6` copies, `129` missing

## Manual/Auth Browser Smoke Still Required

Use a real signed-in session for the checkpoint user or another user with a fresh DB checkpoint.

Required browser checks:

1. Login/session works and persists after redirect.
2. `/dex` shows non-public owned progress for the signed-in user.
3. `/dex/pikachu` summary matches the DB checkpoint for that signed-in user.
4. `/dex/pikachu?view=owned` shows only owned prints.
5. `/dex/pikachu?view=missing` shows missing prints and `Find card` actions.
6. `Find card` opens the expected `/card/[gv_id]` route.
7. Signed-out or unauthenticated requests do not show private ownership counts.

## Preview/Staging Decision

Do not enable Grookai Dex in preview/staging until authenticated browser smoke passes with real credentials or an existing logged-in browser session.
