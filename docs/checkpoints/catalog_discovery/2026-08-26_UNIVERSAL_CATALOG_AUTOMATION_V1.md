# Universal Catalog Automation V1 Checkpoint

## Status

`ACTIVE_AND_GOVERNED_WITH_ENGLISH_AUTHORITY_BACKLOG`

The cross-TCG discovery and bounded promotion architecture is operational. The
Japanese numbered-product gap is closed. Remaining detected gaps are preserved
as report-only English Pokemon acquisition work because the current evidence
does not authorize unattended canonical writes.

## Producer

- Database apply producer SHA: `95fbc0c1d6a66960e168d80e7ec7b91967fcb58d`
- Producer branch: `fix/catalog-automation-completion-v1`
- Pull request: `https://github.com/OriginalSoseji/grookai_vault/pull/245`
- Apply date: `2026-08-26` America/Denver (`2026-08-27` UTC)
- Apply mode: exact clean-SHA, insert-only, supervisor-bounded

The checkpoint may be committed after the producer SHA. That later documentation
commit did not produce the database mutation.

## What Changed

- Pokemon set matching is now language scoped. English `mee` and Japanese `MEE`
  cannot collide because their source and database keys are independently scoped.
- Japanese official card reconciliation now accepts the exact
  `printed_set_abbrev` coordinate in addition to the internal set code.
- Discovery preserves frozen numbered-base checklist rows for exact downstream
  reconciliation.
- A dedicated official-Japanese writer now supports numbered product sets when:
  - the official Japanese source proves each missing card;
  - the Limitless numbered checklist proves the complete coordinate set;
  - existing plus proposed coordinates close the set exactly;
  - no source-set or natural-coordinate collision exists.
- The writer preserves Japanese printed names. It does not invent English names
  or species links. Family review remains `pending` and promotion is disabled.
- Exact image candidates are emitted and aggregated, but external URLs are never
  published as canonical image pointers.
- The MTG supervisor now evaluates the current UTC date instead of the stale
  hard-coded `2026-08-16` date.

## Production Apply

| Set | Existing | Inserted | Final | Evidence inserted | Family reviews |
|---|---:|---:|---:|---:|---:|
| MEE | 11 | 9 | 20 | 18 | 9 |
| MEM | 13 | 5 | 18 | 10 | 5 |
| MEZ | 11 | 9 | 20 | 18 | 9 |
| **Total** | **35** | **23** | **58** | **46** | **23** |

Durable readback proved:

- `23` new `card_prints` rows;
- `23` active `card_print_identity` rows;
- `46` source-evidence rows;
- `23` pending family-review rows;
- `0` promoted family links;
- `0` child printings;
- `0` external mappings;
- `0` Vault rows;
- `0` canonical or representative image pointers.

Every card in all three completed sets now has official Japanese source evidence.

## Post-Apply Discovery

- Source sets checked: `1,257`
- MTG actionable gaps: `0`
- One Piece actionable released gaps: `0`
- Pokemon actionable gaps: `11`
- Recent Japanese canonical missing cards: `0` (previously `23`)
- Recent Japanese official-evidence gaps: `0`
- Actionable gap fingerprint:
  `e2bb3d275ca10dfbebb086a6248b3834243896c5dd8ca6ced607eb9366194f98`

The remaining eleven gaps are English Pokemon only:

- Missing sets: `jumbo`, `me05`, `miscp`, `rc`, `sma`, `sp`
- Incomplete sets: `mfb`, `tk-hs-g`, `tk-hs-r`, `tk-sm-l`, `tk-sm-r`

These rows remain issue-visible and report-only until complete independent
card-level authority exists. A TCGdex count alone is not permission to create
canonical identity. PokemonTCG.io returned upstream `502` responses during the
2026-08-26 acquisition probe and was not treated as corroborating evidence.

## Image Follow-Up

The apply generated `46` evidence-linked source candidates for the `23` new
cards. They remain outside canonical display state. The exact next image gate is:

1. choose one exact source asset per card;
2. download and hash it;
3. verify image/card coordinates;
4. upload to Grookai-controlled Storage;
5. perform collision-safe pointer dry-run and rollback proof;
6. apply pointers only from the exact frozen image manifest;
7. verify no public pointer references an external host.

The scheduled promotion workflow now aggregates these candidates into
`image_candidate_backlog.json` and opens or updates the dedicated GitHub backlog.

## Verification

- Targeted catalog contracts: `45/45` passed.
- Syntax/import checks passed for discovery, supervisor, and all catalog writers.
- Clean-SHA rollback proof: `3/3` Japanese targets passed.
- Rollback absence: zero cards, identities, evidence, and review rows remained.
- Runtime preflight: `PASS_WITH_DEFERRED_DEBT`, with zero critical failures.
- Full repository shipcheck was not completed in the isolated worktree because
  the web workspace lacked its React/JSX dependencies. The resulting type errors
  were environment/dependency failures across existing web files, not catalog
  test failures.

## Artifact Hashes

| Artifact | SHA-256 |
|---|---|
| Frozen discovery summary | `2541faa2b0662d4097716eb53892bdd10c1b716fa577859cac956c1b5886e155` |
| Clean-SHA rollback summary | `8064a651dd90505cdc185179b82f9f575a4c5195663e76582d00ab81b3dc69eb` |
| Durable apply summary | `1dd6d30248c0b4c794160844e008282873e50aeef7953000d903d76a23323eb6` |
| Apply image backlog | `ebfe6d25de790f6445cf8c39e866458aa00250071ebfd4c9856537c60025d264` |
| Post-apply discovery summary | `8d682a61305aa4a4f138b808985ce7c7e90772d6dc7e468cf375ef09cd9e5c66` |

## Invariants

- Discovery is read-only.
- Apply requires the exact clean commit SHA.
- Writers are source-specific and insert-only.
- Future releases, ambiguous identities, incomplete evidence, count disagreement,
  and coordinate collisions produce no writes.
- No source can create a canonical fact outside its proven authority.
- Images are self-hosted before they become display pointers.
- Pricing, publication, child printing, Storage, pointer, and Vault writes remain
  outside catalog identity promotion.

## Exact Next Gates

1. Merge PR `#245` after required GitHub checks pass.
2. Verify the first default-branch discovery and promotion schedules complete.
3. Process the 46 exact image candidates through the separate self-hosting gate.
4. Build independent card-level authority for the eleven English Pokemon gaps,
   prioritizing current `me05` before historical special-set debt.
5. On or after the official release date, let future-release rows such as One
   Piece `OP17` enter the existing release-gated promotion path.

Do not weaken the evidence gate to make the remaining queue read zero.
