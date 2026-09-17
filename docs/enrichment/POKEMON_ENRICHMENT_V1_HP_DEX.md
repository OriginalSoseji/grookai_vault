## Pokemon Enrichment v1: HP + National Dex

Enrichment v1 defines HP and National Pokédex number traits from PokemonAPI
payloads. As of September 17, 2026, the legacy worker only proposes evidence for
review. It does not update traits or backfill mappings. The historical data model
below is preserved; fresh writes need reviewed Master Index execution.

### Data Model
- Trait surface: `card_print_traits` table (shared with existing normalize workers).
- Fields in scope (v1):
  - `hp` (integer)
  - `national_dex` (integer, nullable)
- Additional columns remain available (`trait_type`, `trait_value`, `source`, `confidence`, `created_at`).
- Future enrichment phases (types, rarity, special tags, etc.) will extend the same surface.

### Worker Behavior
- Worker: `backend/pokemon/pokemon_enrichment_worker.mjs`
- Command: `npm run pokemon:enrich` (runs `--mode=backfill --dry-run`, default limit 50).
- Inputs: PokemonAPI card payloads from `raw_imports` (`source='pokemonapi'`, `_kind='card'`).
- Identity matching: resolve set via PokemonAPI codes/ids, then match `card_prints` by (a) external_ids->pokemonapi, (b) set + number, (c) set + number_plain.
- Writes: none. Output preserves the source payload, raw row ID, candidate parent
  and proposed traits with `write_ready:false`. Matching is not verified identity.
- Behavior:
  - Skips cards with neither hp nor dex.
  - Skips if no card_print match or multiple matches.
  - Review never fills or overwrites stored hp/dex.
  - Use `npm run pokemon:enrich -- --limit=25` for a smaller review; maximum 500.
  - Applying or removing dry-run is rejected, including through the npm alias.

### Coverage Checks
Run in Supabase Studio (see `docs/sql/ENRICHMENT_HP_DEX_COVERAGE.sql`):

```sql
-- total card prints
select count(*) as total_card_prints from card_prints;

-- trait rows coverage
select
  count(*) as card_print_traits_rows,
  count(*) filter (where hp is not null) as trait_rows_with_hp,
  count(*) filter (where national_dex is not null) as trait_rows_with_dex
from card_print_traits;

-- Pokemon-only coverage
select
  s.game,
  count(*) as card_prints,
  count(*) filter (where t.hp is not null) as prints_with_hp,
  count(*) filter (where t.national_dex is not null) as prints_with_dex
from card_prints cp
join sets s on cp.set_id = s.id
left join card_print_traits t on t.card_print_id = cp.id
group by s.game
order by card_prints desc;
```

### AI Impact
- HP and National Dex become part of the canonical trait surface used by AI/ingestion.
- Legacy and PokemonAPI prints expose the same trait schema, reducing bias across data lanes and simplifying future enrichment (types/rarity/weakness/etc.).
