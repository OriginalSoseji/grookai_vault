# Master Set Variant Display Browser Smoke

Generated: 2026-05-18

Mode: local production `next start` smoke with Grookai Dex enabled only for local verification.

## Environment

- Base URL: `http://127.0.0.1:3073`
- Browser: local Chrome through Playwright
- Build mode: production build
- Local flags:
  - `GROOKAI_DEX_V1_ENABLED=true`
  - `NEXT_PUBLIC_GROOKAI_DEX_V1_ENABLED=true`
  - `NODE_OPTIONS=--use-system-ca`

## Checks

### `/sets/sv8pt5`

Result: PASS

- Set page rendered with `Prismatic Evolutions` heading.
- Parent grid rendered `Exeggutor`.
- Child printing finish chips were visible on set tiles:
  - `Master Ball`
  - `Poké Ball`

Screenshot:

- `browser_smoke_set_sv8pt5_finishes_20260518.png`

### `/dex/pikachu`

Result: PASS

- Page rendered with `Pikachu` heading.
- Species Dex denominator stayed parent-print based: `0 / 223 card prints owned`.
- Tabs rendered: `All 223`, `Owned 0`, `Missing 223`.
- Duplicate-looking parent labels were visible:
  - `Pokemon Together Stamp`
  - `Standard Print`

Screenshot:

- `browser_smoke_dex_pikachu_20260518.png`

### `/dex/pikachu?view=missing`

Result: PASS

- Missing view rendered.
- Species Dex denominator stayed parent-print based: `0 / 223 card prints owned`.
- Missing card action rendered: `Find card`.

Screenshot:

- `browser_smoke_dex_pikachu_missing_20260518.png`

### `/card/GV-PK-PRE-002`

Result: PASS

- Card detail rendered with `Exeggutor`.
- Child printing finish labels were visible:
  - `Master Ball`
  - `Poké Ball`

Screenshot:

- `browser_smoke_card_premium_parallel_20260518.png`

### `/card/GV-PK-SM-SM10-STAFF-PRERELEASE-STAMP`

Result: PASS

- Card detail rendered with `Shiinotic`.
- Parent variant label was visible:
  - `Staff Prerelease Stamp`

### `/card/GV-PK-SM-SM10-PRERELEASE-STAMP`

Result: PASS

- Card detail rendered with `Shiinotic`.
- Parent variant label was visible:
  - `Prerelease Stamp`

Screenshot:

- `browser_smoke_prerelease_stamp_20260518.png`

## Result

PASS: actual browser-rendered UI shows the required display discriminators for set page tiles, Dex duplicate-looking rows, missing-card actions, child premium parallel finishes, and prerelease/staff parent variants.

No DB writes, migrations, scanner changes, denominator changes, or public Dex enablement were performed.
