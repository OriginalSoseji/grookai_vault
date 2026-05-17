# Number Normalization Plan

Status: planning only. This file proposes audit rules and dry-run query shapes only. It authorizes no Supabase writes, migrations, inserts, updates, deletes, or migration repair.

## Problem Statement

Some upstream or local rows have the real printed number only in external IDs or source payload fields. `card_prints.number` may not always hold the canonical printed identity, and `card_prints.number_plain` can be generated or derived in ways that hide source truth. Number normalization must happen before missing-card backfill because checklist comparison depends on stable printed identity.

The audit script already derives number keys from direct number fields first, then from source IDs such as `external_ids.tcgdex` and `external_ids.pokemonapi` when direct values are missing. That is useful for detection, but it is not a write policy.

## Source Fields To Audit

- `card_prints.number`
- `card_prints.number_plain`
- `raw_imports.payload`
- `external_mappings.external_id`
- TCGdex payload fields and `external_ids.tcgdex` when present
- PokemonTCG API payload fields and `external_ids.pokemonapi` when present

## 2026-05-17 Evidence And Dry-Run Artifacts

- `number_normalization_evidence_20260517.md`
- `number_normalization_evidence_matrix_20260517.json`
- `number_normalization_candidate_evidence_20260517.md`
- `number_normalization_candidate_evidence_matrix_20260517.json`
- `number_normalization_collision_investigation_20260517.md`
- `number_normalization_collision_investigation_matrix_20260517.json`
- `number_normalization_dry_run_implementation_plan_20260517.md`
- `number_normalization_dry_run_implementation_plan_20260517.sql`

Live read-only evidence found 997 physical Pokemon `card_prints` rows where both `number` and `number_plain` are missing and recoverable from TCGdex source identifiers. Of those, 374 are blocked by current set-canonicalization hard-stop groups and 623 are outside hard-stop groups. The first possible future dry-run lane is the 504 non-hard-stop rows with one numeric source-derived candidate, but no write is approved yet.

The row-level candidate evidence split those 504 Lane A rows into 248 clean future write-plan candidates and 256 blocked rows. The blockers are existing same-set `number` or `number_plain` collisions, not source-carrier or active-identity conflicts.

The collision investigation classified those 256 blocked rows as:

- 154 likely duplicate import rows.
- 27 same-card duplicate review rows.
- 75 same-number/different-card ambiguity rows, often exposing prefix/subset or name-token collapse risk.
- 2 candidates with user/market references, both in `me01`.

That means the next implementation planning unit must target only the 248 clean rows or run set-scoped duplicate/source-ownership investigations first; the full 504-row lane is not safe as a bulk write scope.

The same evidence found 1,554 rows where direct printed number and `number_plain` normalize differently. This confirms that `number_plain` must not be treated as canonical printed identity by itself.

## Proposed Normalization Rules

- Printed physical identity remains the source of truth.
- Never overwrite generated fields directly.
- Preserve original source strings and source payloads.
- Derive comparable fields only after audit evidence proves the source string, set ownership, and printed identity.
- Treat source-specific IDs as evidence, not as automatic canonical numbers.
- Keep slash-number semantics separate from normalized comparison keys, especially where generated `number_plain` logic strips non-numeric characters.
- Treat unnumbered cards as intentionally unnumbered only when the source page and product context prove that state.

## Dry-Run SQL Shapes Only

These query shapes are read-only and intended for future reporting.

```sql
-- Find rows where canonical printed number may be missing but source IDs carry a tail number.
select
  s.code as db_set_code,
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.number_plain,
  cp.external_ids ->> 'tcgdex' as tcgdex_id,
  cp.external_ids ->> 'pokemonapi' as pokemonapi_id
from public.card_prints cp
join public.sets s on s.id = cp.set_id
where s.game = 'pokemon'
  and (cp.number is null or btrim(cp.number) = '')
  and (
    cp.external_ids ->> 'tcgdex' like '%-%'
    or cp.external_ids ->> 'pokemonapi' like '%-%'
  );
```

```sql
-- Compare direct number fields against source mapping external IDs.
select
  s.code as db_set_code,
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.number_plain,
  em.source,
  em.external_id
from public.card_prints cp
join public.sets s on s.id = cp.set_id
left join public.external_mappings em on em.card_print_id = cp.id
where s.game = 'pokemon'
  and em.source in ('tcgdex', 'pokemonapi', 'tcgplayer', 'justtcg')
  and (
    cp.number is null
    or cp.number_plain is null
    or em.external_id like '%-%'
  );
```

```sql
-- Inspect raw payload shape before trusting a source-derived number.
select
  ri.source,
  ri.external_id,
  ri.payload ->> 'number' as payload_number,
  ri.payload ->> 'localId' as payload_local_id,
  ri.payload ->> 'id' as payload_id
from public.raw_imports ri
where ri.source in ('tcgdex', 'pokemonapi')
  and (
    ri.payload ? 'number'
    or ri.payload ? 'localId'
    or ri.payload ? 'id'
  );
```

```sql
-- Detect generated-comparison risk where slash or prefixed numbers may collapse.
select
  s.code as db_set_code,
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.number_plain
from public.card_prints cp
join public.sets s on s.id = cp.set_id
where s.game = 'pokemon'
  and cp.number ~ '[/A-Za-z]'
  and cp.number_plain ~ '^[0-9]+$';
```

## Future Implementation Sequence

1. Build a no-write number evidence report by set and source.
2. Split results into direct printed numbers, source-derived candidate numbers, unnumbered cards, and generated-field risks.
3. Review each affected set after set canonicalization is complete.
4. Approve normalization rules for slash numbers, prefixed numbers, unnumbered energy cards, and promo prefixes.
5. Only then design a separate authorized implementation pass.

The 2026-05-17 dry-run implementation plan narrows the first possible candidate lane to numeric, non-hard-stop, source-derived missing-number rows only. The candidate evidence narrows that again to the 248 collision-free Lane A rows. The collision investigation confirms that the remaining 256 rows are ownership/integrity work, not number-normalization write candidates. Prefixed numbers, complex suffixes, source conflicts, identity conflicts, collision rows, and hard-stop set rows remain blocked.

## Implementation Stop Conditions

- Canonical set ownership is unresolved.
- Two sources disagree on the printed number for the same physical card.
- `number_plain` or another generated field would collapse distinct printed identities.
- Raw payloads are missing, slim, or source fields cannot prove printed identity.
- External ID tails conflict with card names or set ownership.
- Secret-range numbering is involved but source checklist ownership is not proven.
