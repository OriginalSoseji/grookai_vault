# Pokemon Language Master Index Automation V1

## Governing Order

Every Pokemon catalog update follows one order:

```text
language source evidence
  -> language-scoped Master Index
  -> canonical reconciliation
  -> bounded canonical writer
  -> separate self-hosted image promotion
```

Source discovery is never canonical write authority. A source row cannot skip
the Master Index because its set code, card count, or name appears exact.

## Supported Languages

- `en`: checked-in English Master Index V1. The scheduled refresh rebuilds it
  from its governed sources and opens a data-only pull request when facts change.
- `ja`: fingerprint-verified Japanese Master Index V4 admissible set and card
  datasets. New source evidence enters the Japanese index-update queue first.

Any other language is unsupported until it has its own persistent Master Index
authority and adapter. Unsupported language rows produce no canonical targets.

## Admission

- Set ownership is language scoped.
- Canonical ownership is measured through `card_prints.set_id`.
- Printed set abbreviations and source aliases are evidence, not ownership joins.
- Alias and subset rows resolve to one existing owner and write nothing.
- A complete card delta requires persistent Master Index card facts, not only a
  same-run API count.
- New sets require both Master Index admission and a separately proven missing-set
  writer. Master Index admission alone does not authorize database creation.
- Master Index refreshes never write to the database, Storage, pricing,
  publication, or Vault tables.

## Automated Operation

1. `Pokemon Master Index Refresh` rebuilds English evidence daily.
2. A changed English fact set is copied only to a data branch and proposed as a
   pull request; unchanged runs write nothing.
3. `Universal Catalog Discovery` verifies the checked-in English and Japanese
   authorities before reconciling source catalogs.
4. Blocked rows are emitted to
   `pokemon_master_index_update_candidates.json` and the deduplicated GitHub
   Master Index issue.
5. `Catalog Incremental Promotion` consumes only
   `canonical_promotion_candidates.json`.

## Fail-Closed Conditions

- missing or invalid Master Index artifact;
- fingerprint or shard mismatch;
- unresolved set owner or alias;
- incomplete Master Index card coverage;
- duplicate source/card coordinate;
- unexplained removal during refresh;
- language without registered authority;
- new canonical set without a proven missing-set writer.

These conditions are backlog or incident signals. They are not permission to
infer identity from the live database.
