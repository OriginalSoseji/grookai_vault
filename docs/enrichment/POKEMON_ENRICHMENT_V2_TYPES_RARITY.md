## Pokemon Enrichment v2: Types & Rarity Standardization

PokemonAPI supplies trait evidence for types/rarity and supertype/card_category.
As of September 17, 2026, the legacy worker is bounded review-only. Provider
payloads and matching heuristics do not authorize canonical mutations; existing
traits and legacy values remain unchanged pending reviewed execution.

### Data Model
- Canonical trait surface: `card_print_traits` (shared with normalize and enrichment workers).
- Fields in scope for v2:
  - `types` (text[])
  - `rarity` (text)
  - `supertype` (text)
  - `card_category` (text, derived from supertype/subtypes)
  - `legacy_rarity` (text, holds prior rarity when API differs)
- HP/Dex from v1 remain on the same surface (`hp`, `national_dex`).
- Identity fields on `card_prints` (set_id, number_plain, variant_key, name) are untouched.

### Worker Behavior
- Worker: `backend/pokemon/pokemon_enrichment_worker.mjs`
- Command: `npm run pokemon:enrich` (backfill mode, explicit dry-run, default limit 50).
- Inputs: PokemonAPI card payloads from `raw_imports` (`source='pokemonapi'`, `_kind='card'`, `status='normalized'`).
- Matching: reads active PokemonAPI mappings, then uses set/number matching for
  candidate discovery only. Read errors stop the run; no mapping is backfilled.
- Writes: none. JSON evidence retains raw row ID, source payload, candidate parent
  and proposed traits with `database_writes:0` and `write_ready:false`.
- Options: explicit dry-run is supplied by the alias. Use
  `npm run pokemon:enrich -- --limit=25`; limit must be 1..500. Apply is rejected.

### Coverage Checks
Run in Supabase Studio (see `docs/sql/ENRICHMENT_HP_DEX_COVERAGE.sql`):

```sql
-- PokemonAPI mapping and trait coverage
select
  count(*) as mapped_card_prints,
  count(*) filter (where t.types is not null) as with_types,
  count(*) filter (where t.rarity is not null) as with_rarity,
  count(*) filter (where t.supertype is not null) as with_supertype,
  count(*) filter (where t.card_category is not null) as with_card_category
from external_mappings em
join card_print_traits t on t.card_print_id = em.card_print_id
where em.source = 'pokemonapi';
```

### AI Impact
- Types/rarity/supertype/card_category are standardized from PokemonAPI across legacy and new prints, reducing divergence in downstream AI and UI.
- Legacy rarity remains accessible via `legacy_rarity` when it differed, avoiding silent loss while enforcing the new standard. HP/Dex continue to share the same trait surface for future AI features.
