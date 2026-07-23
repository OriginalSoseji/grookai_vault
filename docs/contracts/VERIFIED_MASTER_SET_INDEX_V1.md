# VERIFIED_MASTER_SET_INDEX_V1

Status: Active
Date: 2026-05-23

## Purpose

`VERIFIED_MASTER_SET_INDEX_V1` defines Grookai's audit-only reference index for English Pokemon TCG set cards and printings.

The index is not derived from Grookai canon. It is built from external source agreement, then used to verify Grookai canon later.

Grookai may be incomplete, but it must not display invented printings as truth.

## Scope

In scope:

- English Pokemon TCG sets
- set card identity
- card number
- card name
- verified finish/printing facts
- source evidence and conflict reporting

Out of scope:

- non-English cards
- pricing
- vault ownership
- provenance mutation
- scanner behavior
- canonical DB writes
- public visibility changes

## Source Standard

Structured API agreement is not sufficient by itself to govern high-risk printing and finish truth. For any fact that affects a printing/finish row, at least one human-readable, official, or checklist-style source must be present before the fact can be `master_verified`.

### API Agreement

Two or more structured API sources agree.

Status:

```text
api_agreed
```

Meaning:

- useful structured agreement
- not enough alone for high-risk finish truth
- cannot drive destructive cleanup
- cannot become final master truth for printings or finishes by itself

### Human-Readable / Checklist Evidence

At least one source is reviewable by humans and describes the card, set, or printing in a checklist or set-list context.

Allowed source kinds:

- `official_gallery`
- `human_readable_checklist`
- `marketplace_checklist`
- `collector_reference`
- `manual_review`

Status contribution:

```text
human_source_verified
```

### Master Verified

A card may become `master_verified` when at least two independent sources agree and the source model has no unresolved conflict.

A printing/finish may become `master_verified` only when:

```text
source_count >= 2
AND at least one source is human-readable, official, or checklist-style
AND the human-readable/checklist source supports that exact finish/printing fact
```

## Admission Rule

A fact may enter the verified index only when at least two independent English sources agree on the same fact.

Required card identity agreement:

```text
set + card number + card name
```

Required printing agreement:

```text
set + card number + card name + finish_key
```

One source creates a candidate only. It does not create verified truth.

## Source Independence Rule

Sources must be tracked by source name, source kind, and evidence URL or source identifier. The V1 pilot permits:

- `tcgdex`
- `pokemontcg_api`
- `thepricedex_price_list`
- `pkmncards`
- `bulbapedia_set_list`
- bounded fixture-backed human-readable/checklist sources

Additional sources may be added only as explicit adapters that preserve source name, retrieval timestamp, raw identity fields, and evidence URL.

### ThePriceDex Checklist Rule

`thepricedex_price_list` is allowed as `marketplace_checklist` evidence only when the adapter reads exact card-level variant rows from a set price-list page.

The adapter may emit `finish_presence` only for explicitly listed variants that map to Grookai's governed finish vocabulary, such as:

```text
normal
holo
reverse
first_edition_normal
first_edition_holo
pokeball
masterball
cosmos
cracked_ice
stamped
```

Unknown marketplace variants, signatures, jumbo rows, or product-specific labels must not become canonical finish truth by default. They must be ignored or held for manual review until a governed finish mapping exists.

### CardTrader Fail-Closed Rule

CardTrader blueprint rows may emit `normal` only when an explicit governed variant descriptor says `Normal` or `Non-Holo`. An unqualified rarity or product row, including `Ultra Rare`, is unknown finish evidence and emits no printing fact. Absence of Holo, Reverse, stamp, or other tokens is never proof of Normal.

Explicit governed Holo, Reverse Holo, stamped, parallel, and edition descriptors may continue through their exact adapters. Unknown or conflicting labels remain manual-review evidence.

Legacy generated CardTrader fixtures remain immutable audit evidence, but the fixture loader must downgrade any CardTrader `normal` record whose evidence label lacks an explicit Normal/Non-Holo descriptor to exact card/source evidence with unknown finish. It emits no printing fact. A historical derived label cannot bypass the repaired source adapter during rebuild.

### Promo Family Fail-Closed Rule

Black Star Promo finish truth is product-specific. A structured source may support card identity for promo families, but a single structured `normal` claim must not create canonical promo finish truth.

For promo-family sets such as:

```text
Wizards Black Star Promos
Nintendo Black Star Promos
DP/HGSS/BW/XY/SM/SWSH/SV/MEP Black Star Promos
```

`normal` finish evidence from TCGdex is ignored unless another governed source independently supports the exact same finish fact. Human/checklist sources such as ThePriceDex may still contribute exact promo finish facts when the specific variant is listed.

### Exact Checklist Suppression Rule

When a card has exact human/checklist variant evidence, a single structured-source finish claim that is absent from that checklist evidence is not working Master Index truth.

The pipeline must:

```text
exclude the single-source structured finish from working printings
retain the excluded row in an audit report
avoid treating the exclusion as Grookai deletion authority
```

This rule normally applies to single-source structured finish claims. Multi-source structured agreement, human/checklist-supported finishes, conflicts, and product-specific variants must remain visible for review unless an explicit reviewed-suppression fixture proves that the agreeing sources expose taxonomy or transport metadata rather than physical finish truth and exact card-level checklists contradict the claimed finish.

An explicit reviewed suppression must preserve every source claim, the contradicting exact checklist evidence, the reviewer rationale, retrieval timestamp, and stable fixture reference. It excludes the claim from working Master Index truth; it does not erase evidence or authorize a Grookai deletion.

### Marketplace Bridge Rule

Marketplace/checklist bridge evidence may support a printing/finish fact only when it does not create the fact.

For `tcgplayer_price_guide` evidence:

```text
the exact finish fact must already exist in at least two structured sources
AND one of those structured records must expose TCGplayer price-guide metadata
AND the bridge row must preserve the marketplace URL
```

This bridge may promote already-agreed finish evidence to `master_verified` with a marketplace/checklist source present.

It must not promote single-source finish facts, resolve source disagreements, infer missing variants, or create new printings.

### Supportive Collector Reference Rule

Collector-reference or human-readable set-list adapters such as `pkmncards` and `bulbapedia_set_list` may support card identity only when the same exact working fact was already observed from another governed source:

```text
set + card number + card name
```

These adapters must not introduce unmatched source-only card identities into canonical working truth by default. If a source uses alternate names, symbols, suffixes, or product wording that does not exactly match an existing governed fact, that evidence remains a source-exhaustion/manual-review concern until alias governance can resolve it.

Current limits:

- `pkmncards` is a collector-reference card identity support lane only.
- `bulbapedia_set_list` is an optional human-readable checklist card identity and rarity-context lane only.
- neither adapter emits finish/printing truth.
- neither adapter may infer reverse holo, holo, stamped, cosmos, cracked ice, Poke Ball, Master Ball, Rocket reverse, or product-exclusive variants.

Required source record shape:

```text
{
  source_key,
  source_kind,
  source_url,
  set_key,
  set_name,
  card_number,
  card_name,
  finish_key,
  evidence_type,
  evidence_text_or_label,
  retrieved_at,
  raw_snapshot_ref
}
```

Allowed `source_kind` values:

```text
structured_api
official_gallery
human_readable_checklist
marketplace_checklist
collector_reference
manual_review
```

## English-Only Rule

All source adapters must fetch or accept English-only source data. If a source cannot prove the language boundary, its facts remain candidates and cannot be promoted.

## Set-Specific Finish Profile Rule

Named set pilots must declare a source-backed finish profile before finish matrix reports can run.

The finish profile must include:

- source URL for the set-specific finish rule
- allowed focus finishes for that set
- finishes that are explicitly not applicable for that set
- notes explaining the source-backed rule

Generic era assumptions are forbidden. A modern set must not inherit finishes such as `masterball` unless a source proves that finish applies to that set.

For set-specific parallel systems, the profile must name the exact finish keys. For example, Ascended Heroes uses:

```text
reverse
pokeball
rocket_reverse
```

and marks:

```text
masterball
```

as not applicable.

### Locked Chaos Rising / ME04 Finish Profile

The aliases `me04` and `me4` resolve to one locked Chaos Rising profile:

```text
expected_parent_count = 122
expected_printing_count = 202
normal = 68
reverse = 76
holo = 58
```

The profile additionally requires:

- exclusion of the exact 45 historical false Normal facts declared by `docs/audits/verified_master_set_index_v1/source_fixtures/generated_me04_finish_governance_v1/me04.json`;
- preservation of valid Build & Battle Normal printings `013 Delphox`, `029 Ampharos`, `051 Crobat`, and `068 Goodra`;
- Holo-only treatment for `109 Jumbo Ice Cream`; a Normal fact is forbidden;
- exact identity equality, not only aggregate-count equality.

The executable authority is `scripts/audits/me04_finish_truth_v1.mjs`. Any ME04 source, staging, completion, or publishable build that drifts from this profile is `conflict_blocked` or incomplete and must emit no publishable replacement.

## Candidate And Conflict Rule

Facts with one source are classified as:

```text
candidate_unconfirmed
```

Facts with source disagreement are classified as:

```text
conflicting
```

Conflicting facts must not be promoted into the verified index until the conflict is manually resolved with recorded evidence.

Required statuses:

- `api_agreed`: two or more structured API sources agree, but no human-readable/checklist source has confirmed the same fact yet.
- `human_source_verified`: at least one human-readable/checklist/official source supports the fact, but full source agreement may still be incomplete.
- `master_verified`: the fact satisfies the full source standard.
- `candidate_unconfirmed`: only one source supports the fact.
- `conflicting`: sources disagree on the same identity, printing, or finish fact.
- `needs_manual_review`: source data is too ambiguous to classify safely.
- `unsupported_by_index`: Grookai contains the printing, but the Verified Master Set Index does not support it.
- `missing_from_grookai`: the Verified Master Set Index supports the printing, but Grookai does not contain it.
- `source_unavailable`: a configured source does not expose the target set/fact yet or no stable source alias is known.
- `not_applicable`: a source-backed set finish profile says the finish does not apply to the set.

## Audit-Only Rule

V1 workers and reports must not write to Supabase or mutate local canonical fixtures. Allowed outputs are local files under:

```text
docs/audits/verified_master_set_index_v1/
```

## Verification Boundary

The verified index is the reference layer for later Grookai DB comparison.

Grookai catalog rows are not considered verified by this contract unless they match a verified index fact. Unsupported or missing rows require a separate comparison report before quarantine, deletion, or public hiding.

Do not delete, quarantine, or hide Grookai rows based only on `api_agreed`. Do not hide Grookai rows based only on lack of API agreement. The index must mature before cleanup.
