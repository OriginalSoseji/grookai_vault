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
- bounded fixture-backed human-readable/checklist sources

Additional sources may be added only as explicit adapters that preserve source name, retrieval timestamp, raw identity fields, and evidence URL.

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
