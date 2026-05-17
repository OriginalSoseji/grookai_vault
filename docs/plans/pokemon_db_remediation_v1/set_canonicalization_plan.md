# Set Canonicalization Plan

Status: planning only. This file proposes future review and dry-run checks only. It authorizes no Supabase writes, migrations, inserts, updates, deletes, or migration repair.

## Purpose

Create one canonical DB set row per English physical Pokemon TCG set or collection, then treat alternate upstream IDs, historical aliases, routing codes, and source-specific names as aliases or source mappings. This is the first remediation step because every downstream card, number, and variant decision depends on deterministic set ownership.

## Why This Is The First Blocker

The audit found 29 duplicate DB physical set-name groups. A missing-card backfill cannot safely choose a target set while two rows represent the same English release. Importing checklist gaps before resolving aliases would either split new rows across duplicate sets or require another correction pass later.

Examples called out by the audit:

- `sv08.5` vs `sv8pt5` for Prismatic Evolutions.
- `sv03.5` vs `sv3pt5` for 151.
- `sv04.5` vs `sv4pt5` for Paldean Fates.
- `sv06.5` vs `sv6pt5` for Shrouded Fable.
- `swsh12.5` vs `swsh12pt5` for Crown Zenith.
- `sm7.5` vs `sm75` for Dragon Majesty.
- `me01` vs `me1` and `me02` vs `me2` for modern Mega Evolution-era aliases.

## Duplicate Physical Set-Name Groups From Audit

| Name key | Rows | Codes | Names |
| --- | ---: | --- | --- |
| 151 | 2 | `sv03.5`, `sv3pt5` | 151 |
| best of game | 2 | `bog`, `bp` | Best of Game, Best of game |
| black bolt | 2 | `sv10.5b`, `zsv10pt5` | Black Bolt |
| champions path | 2 | `swsh3.5`, `swsh35` | Champion's Path |
| crown zenith | 2 | `swsh12.5`, `swsh12pt5` | Crown Zenith |
| dragon majesty | 2 | `sm7.5`, `sm75` | Dragon Majesty |
| ex trainer kit 2 minun | 2 | `tk-ex-m`, `tk2b` | EX Trainer Kit 2 Minun, EX trainer Kit 2 (Minun) |
| ex trainer kit 2 plusle | 2 | `tk-ex-p`, `tk2a` | EX Trainer Kit 2 Plusle, EX trainer Kit 2 (Plusle) |
| ex trainer kit latias | 2 | `tk-ex-latia`, `tk1a` | EX Trainer Kit Latias, EX trainer Kit (Latias) |
| ex trainer kit latios | 2 | `tk-ex-latio`, `tk1b` | EX Trainer Kit Latios, EX trainer Kit (Latios) |
| heartgold soulsilver promos | 2 | `hgssp`, `hsp` | HGSS Black Star Promos |
| journey together | 2 | `sv09`, `sv9` | Journey Together |
| legendary collection | 2 | `base6`, `lc` | Legendary Collection |
| mega evolution | 2 | `me01`, `me1` | Mega Evolution |
| obsidian flames | 2 | `sv03`, `sv3` | Obsidian Flames |
| paldean fates | 2 | `sv04.5`, `sv4pt5` | Paldean Fates |
| paradox rift | 2 | `sv04`, `sv4` | Paradox Rift |
| phantasmal flames | 2 | `me02`, `me2` | Phantasmal Flames |
| pokemon go | 2 | `pgo`, `swsh10.5` | Pokemon GO |
| prismatic evolutions | 2 | `sv08.5`, `sv8pt5` | Prismatic Evolutions |
| scarlet and violet | 2 | `sv01`, `sv1` | Scarlet & Violet |
| shining fates | 2 | `swsh4.5`, `swsh45` | Shining Fates |
| shining legends | 2 | `sm3.5`, `sm35` | Shining Legends |
| shrouded fable | 2 | `sv06.5`, `sv6pt5` | Shrouded Fable |
| stellar crown | 2 | `sv07`, `sv7` | Stellar Crown |
| surging sparks | 2 | `sv08`, `sv8` | Surging Sparks |
| temporal forces | 2 | `sv05`, `sv5` | Temporal Forces |
| twilight masquerade | 2 | `sv06`, `sv6` | Twilight Masquerade |
| white flare | 2 | `rsv10pt5`, `sv10.5w` | White Flare |

## Proposed Decision Model

Use one canonical DB set per English physical set. Alternates become aliases/source mappings instead of competing canonical set rows.

Canonical choice should be based on:

- Active `card_prints` ownership and row counts.
- External mapping density by source: PkmnCards, PokemonTCG API, TCGdex, TCGPlayer, JustTCG.
- Public routing and current app usage.
- Existing set metadata quality: release date, printed total, printed set abbreviation, source, identity model.
- Whether a candidate row contains unique real cards that cannot be represented by the other row.

## Required Future Implementation Steps

1. Produce a read-only candidate matrix for each duplicate group with set IDs, codes, metadata, card counts, mapping counts, vault references, public route references, and source payload references.
2. For each duplicate group, choose one canonical set row or mark it blocked.
3. Define alias/source-mapping semantics for non-canonical rows without losing source identity.
4. Produce a no-write impact report showing all FK references that would need future reassignment.
5. Review the candidate matrix before any future authorized write plan.
6. Only after approval, create a separate implementation plan with forward-only, reversible checkpoints.

## Dry-Run SQL Shapes Only

These are read-only query shapes for a future dry-run report. They are not write plans.

```sql
-- Find duplicate normalized physical set names.
select
  lower(regexp_replace(name, '[^a-zA-Z0-9]+', ' ', 'g')) as name_key,
  count(*) as rows,
  array_agg(code order by code) as codes,
  array_agg(name order by code) as names
from public.sets
where game = 'pokemon'
  and coalesce(set_role, '') <> 'pocket'
group by 1
having count(*) > 1;
```

```sql
-- Candidate ownership matrix for one duplicate group.
with candidate_sets as (
  select id, code, name, printed_total, printed_set_abbrev, release_date
  from public.sets
  where game = 'pokemon'
    and code = any(:candidate_codes)
)
select
  s.code,
  s.name,
  s.printed_total,
  s.printed_set_abbrev,
  count(distinct cp.id) as card_print_rows,
  count(distinct em.id) as external_mapping_rows,
  count(distinct em.source) as mapped_sources
from candidate_sets s
left join public.card_prints cp on cp.set_id = s.id
left join public.external_mappings em on em.set_id = s.id
group by s.code, s.name, s.printed_total, s.printed_set_abbrev;
```

```sql
-- Detect source mapping conflicts before any alias decision.
select
  em.source,
  em.external_id,
  count(distinct em.set_id) as mapped_set_count,
  array_agg(distinct s.code order by s.code) as db_set_codes
from public.external_mappings em
join public.sets s on s.id = em.set_id
where s.game = 'pokemon'
group by em.source, em.external_id
having count(distinct em.set_id) > 1;
```

## Hard Stop Conditions

- FK references are ambiguous or cannot be fully enumerated.
- Two candidate sets both contain unique real cards that are not aliases of the same physical set.
- An alias decision would lose identity, source provenance, collector semantics, or public route behavior.
- Source mappings conflict across canonical and alias rows.
- Any proposed canonical row lacks enough source evidence to own future missing-card backfill.
