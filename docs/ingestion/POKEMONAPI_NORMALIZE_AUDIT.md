## PokemonAPI Normalize Audit (cards)

### Card error / notes touchpoints
- `backend/pokemon/pokemonapi_normalize_worker.mjs:438-474` — When normalizing each card, if set resolution yields a single set but `upsertCardPrint` returns `status === 'error'` or a falsy `cardPrintId`, the raw import is marked `status = 'error'`; no notes are written. Conflicts (0 or >1 set) are handled separately and marked `conflict`.
- `backend/pokemon/pokemonapi_normalize_worker.mjs:479-483` — Any exception in the card loop logs `[pokemonapi][normalize] card error` and marks the raw import `status = 'error'`; notes are untouched.
- `backend/pokemon/pokemonapi_normalize_worker.mjs:287-336` — `upsertCardPrint` inserts a new `card_prints` row. Any Supabase insert error returns `{status: 'error', reason: <message>}`, which is propagated to the caller but never persisted to `notes`.
- `backend/pokemon/pokemonapi_normalize_worker.mjs:339-365` — `upsertCardPrint` update path on an existing print returns `{status: 'error'}` if the update fails; the caller marks the raw import `status = 'error'`. No notes write.
- No code path in this worker updates `raw_imports.notes`; only `status` and `processed_at` are written (see `markRawImport`).

### Likely Base Set failure point (code-only reasoning)
- `upsertCardPrint` sets `image_source = SOURCE` (`'pokemonapi'`) whenever an image is present (insert: lines 314-325; update: lines 352-355).
- The database schema (`backups/remote_backup_20251114_220502.sql:766-789`) defines a check constraint `card_prints_image_source_check` allowing only `['tcgdex', 'ptcg']`. Inserting/updating a card_print with `image_source = 'pokemonapi'` violates this constraint and causes the insert/update to error.
- Since the card loop treats any insert/update error as `status = 'error'` and drops the reason, the observed Base Set rows (`status='error', notes=null`) align with this constraint violation. All Base Set cards include images, so the `image_source` assignment would trip the check on the first batch of 50 cards.

### Data-shape assumptions to double-check
- Set lookup for cards only inspects `card.set.id |_external_id |ptcgoCode` (`resolveSet`), ignoring any top-level `_set_external_id`. If card payloads only carry `_set_external_id` without a nested `set` object, they would be marked `conflict` (not `error`) with reason “no set match”; this is not what was observed for Base Set.
- Card identifiers come from `card.id || card._external_id` and numbers from `card.number` (with derived `variant_key` and `number_plain` for matching). Missing numbers are allowed and would not throw; they simply reduce matchability.
- `image_source` is written as soon as any image URL exists; other shared fields (`rarity`, `regulation_mark`, `artist`) are optional. External IDs are only `pokemonapi`, merged into `external_ids`.

### Why notes stay null
- The worker never writes to `raw_imports.notes`, even when it has a `reason` string from `upsertCardPrint` or throws an exception. All failure paths set `status='error'` and stop.

