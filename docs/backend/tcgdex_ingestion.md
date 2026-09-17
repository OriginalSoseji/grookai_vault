# TCGdex Ingestion Pipeline

TCGdex acquisition is namespaced under `source = 'tcgdex'` and stages external
set/card evidence in `raw_imports`. As of September 17, 2026, legacy normalization
is bounded review-only: it does not write sets, cards, mappings, printings, traits,
raw statuses or checkpoints. Evidence needs reviewed Master Index authority and
a separate governed executor before canonical mutation.

## Environment

Set the following environment variables (see `.env.example` for placeholders):

- `TCGDEX_BASE_URL` - Required base URL for the TCGdex REST API (no default).
- `TCGDEX_LANG` - Active language slug for the API (default `en`). TCGdex supports `en`, `fr`, `es`, `es-mx`, `it`, `pt`, `pt-br`, `pt-pt`, `de`, `n`. Grookai Vault currently ingests one language per run; use `en` unless you have a reason to switch.
- `TCGDEX_API_KEY` - Optional API key/header if the instance enforces auth.
- Standard Supabase backend secrets: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.

Legacy normalization requires explicit `--dry-run`, accepts only backfill mode,
defaults to 50 selected rows and caps `--limit` at 500. Its limit covers sets and
cards together; use `--kind=card` for card-only review. Unknown arguments and all
apply spellings are rejected. Acquisition workers have separate staging semantics.

## Commands

Run these scripts from the repo root:

- `npm run tcgdex:import-sets` — Fetches paginated TCGdex set data and upserts into `raw_imports` (`_kind = 'set'`). Supports `--limit`, `--page`, `--mode`, and `--dry-run` for scoped imports.
- `npm run tcgdex:import-cards` — Imports cards per set into `raw_imports` (`_kind = 'card'`). Accepts `--set <setId>` to scope runs, plus `--limit`, `--mode`, and `--dry-run`.
- `npm run tcgdex:normalize` - Reviews up to 50 pending rows with zero database writes. The alias supplies `--dry-run`; for a scoped review use `npm run tcgdex:normalize -- --set <setId> --kind=card --limit=25`.

Evidence preparation order (acquisition may write raw staging, review cannot):

1. `tcgdex:import-sets`
2. `tcgdex:import-cards`
3. `tcgdex:normalize`

This is not an automatic publication chain. Source finish flags and existing
matches remain hints; follow `docs/playbooks/MASTER_INDEX_FIRST_INGESTION_V1.md`
for reviewed planning and bounded execution. Never replay old normalize/apply
commands as a substitute for that contract.

