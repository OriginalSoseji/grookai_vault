## Pokemon Enrichment v1: HP + National Dex

Enrichment v1 adds HP and National Pokédex number traits for Pokemon `card_prints`, using PokemonAPI payloads. Legacy prints and PokemonAPI prints land on the same trait surface so downstream AI can treat them uniformly.

### Data Model
- Trait surface: `card_print_traits` table (shared with existing normalize workers).
- Fields in scope (v1):
  - `hp` (integer)
  - `national_dex` (integer, nullable)
- Additional columns remain available (`trait_type`, `trait_value`, `source`, `confidence`, `created_at`).
- Future enrichment phases (types, rarity, special tags, etc.) will extend the same surface.

### Worker Behavior
- Worker: `backend/pokemon/pokemon_enrichment_worker.mjs`
- Command: `npm run pokemon:enrich` (runs `--mode=backfill`).
- Inputs: PokemonAPI card payloads from `raw_imports` (`source='pokemonapi'`, `_kind='card'`).
- Identity matching: resolve set via PokemonAPI codes/ids, then match `card_prints` by (a) external_ids->pokemonapi, (b) set + number, (c) set + number_plain.
- Writes: non-destructive upserts into `card_print_traits`:
  - `trait_type='pokemon:hp'` with `hp` column
  - `trait_type='pokemon:national_dex'` with `national_dex` column
- Behavior:
  - Skips cards with neither hp nor dex.
  - Skips if no card_print match or multiple matches.
  - Only fills hp/dex when missing; re-runs are safe.
  - `--dry-run` logs intended writes without mutating data; `--limit` caps rows processed.

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
