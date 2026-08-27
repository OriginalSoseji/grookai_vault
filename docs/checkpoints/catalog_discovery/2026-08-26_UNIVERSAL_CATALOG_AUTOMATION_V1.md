# Universal Catalog Automation V1 Checkpoint

## Status

`ACTIVE_AND_GOVERNED_WITH_LANGUAGE_MASTER_INDEX_BACKLOG`

The cross-TCG discovery and bounded promotion architecture is operational. The
Japanese numbered-product gap is closed. Remaining detected gaps are preserved
as report-only English Pokemon acquisition work because the current evidence
does not authorize unattended canonical writes.

Pokemon automation is now explicitly Master-Index-first. Source discovery can
update a language evidence queue, but only a reconciled Master Index delta can
reach a canonical writer.

## Producer

- Database apply producer SHA: `95fbc0c1d6a66960e168d80e7ec7b91967fcb58d`
- Producer branch: `fix/catalog-automation-completion-v1`
- Pull request: `https://github.com/OriginalSoseji/grookai_vault/pull/245`
- Apply date: `2026-08-26` America/Denver (`2026-08-27` UTC)
- Apply mode: exact clean-SHA, insert-only, supervisor-bounded
- Latest automation repair SHA:
  `62b827509adc26e474be720f51b05c8ef451b952`
- Language Master-Index-first enforcement SHA:
  `ccb9c9d24e834e2d4274294016397594b3bdec03`

The checkpoint may be committed after the producer SHA. That later documentation
commit did not produce the database mutation.

The automation repair SHA did not produce a database mutation. Its production
proof used a read-only discovery transaction and a zero-target supervisor plan.

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

## Master-Index-First Repair

The English `sma` / Hidden Fates Shiny Vault row exposed two false assumptions:

1. canonical ownership was counted by comparing a printed set code with a
   canonical set code instead of joining through `card_prints.set_id`;
2. a raw source gap could be considered before a language-scoped Master Index
   owner decision.

Both are repaired at `62b827509adc26e474be720f51b05c8ef451b952`:

- canonical set counts and English card ownership use `card_prints.set_id`;
- `sma` resolves to the existing `sm115` Hidden Fates owner with no set or card
  write;
- future English Master Index rebuilds fold `SV1` through `SV94` from `sma` into
  `sm115`;
- discovery writes `pokemon_master_index_reconciliation.json`;
- unresolved evidence writes `pokemon_master_index_update_candidates.json`;
- only admitted rows enter `canonical_promotion_candidates.json`;
- the catalog promotion supervisor consumes only that admitted candidate file;
- the scheduled discovery workflow maintains a dedicated GitHub Master Index
  evidence-queue issue.

The clean-SHA production read proved:

- source sets checked: `1,257`;
- Pokemon source gaps: `10`, down from `11` after suppressing the false `sma`
  gap;
- recent Japanese missing cards: `0`;
- recent Japanese official-evidence gaps: `0`;
- language Master Index rows: `209` (`203` English, `6` Japanese);
- Master Index update candidates: `66` (`63` English evidence gaps and `3`
  Japanese owner-resolution gaps);
- canonical promotion candidates: `0`;
- supervisor targets: `0`;
- database writes: `0`.

The remaining ten source gaps are:

- missing: `jumbo`, `me05`, `miscp`, `rc`, `sp`;
- incomplete: `mfb`, `tk-hs-g`, `tk-hs-r`, `tk-sm-l`, `tk-sm-r`.

They remain Master Index acquisition work. They are not canonical writer work.

### Master-Index-First Artifact Hashes

| Artifact | SHA-256 |
|---|---|
| Clean discovery summary | `62de483eb23620c4a468e640573c01243a80f20c77463e70bb7a4c4b91c9002f` |
| Pokemon Master Index reconciliation | `1af1b76040c05829cd047d7058023de8a67cb34813b0df66120a873aa758c2ca` |
| Pokemon Master Index update candidates | `e33e6ca2f7e836e03dbdf02e2f8e0d32debc97ad105dcb399acb23ff23811dc8` |
| Canonical promotion candidates | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| Zero-target supervisor summary | `116801849ee2d548b50a9e635e5783a9f8c1d44ba561b89c4607a264fa317837` |
| Zero-target supervisor plan | `c70ae3408100e65284801d25ac5529e45d1bf301f8bf8144357386caf8ac22d1` |

The complete catalog contract suite passed `49/49` with syntax/import and diff
checks passing.

## Scheduled Language Index Enforcement

The follow-up automation closes the remaining ordering loophole:

- `.github/workflows/pokemon-master-index-refresh.yml` rebuilds the English
  Master Index daily from governed source evidence;
- changed facts are proposed on a data-only branch and never written directly
  to canonical tables;
- unexplained card removal, duplicate coordinates, or any candidate conflict
  fails the refresh closed;
- discovery fingerprint-verifies the checked-in Japanese V4 admissible set and
  card shards before reconciling Japanese source rows;
- same-run Japanese official, TCGdex, or Limitless counts no longer substitute
  for persistent Japanese Master Index card authority;
- future Pokemon languages remain blocked until a language-specific persistent
  Master Index adapter exists.

The strict production read-only proof at
`C:\Users\ccabr\AppData\Local\Temp\grookai-catalog-automation-completion-v1\master-index-strict-20260826-230211`
recorded:

- source sets checked: `1,257`;
- actionable source gaps: `10`, all English;
- canonical promotion candidates: `0`;
- Master Index update candidates: `67`;
- recent Japanese canonical gaps: `0`;
- Japanese V4 authority: `1,426` admitted sets and `28,008` admitted cards;
- database, Storage, pricing, publication, image-pointer, and Vault writes: `0`.

Japanese rows now report their actual persistent index state:

- `M4`: complete and Master Index verified;
- `M5`: owner verified, card coverage incomplete (`77/118` for this source view);
- `M6`: no admitted V4 owner yet and queued for index work;
- `MEE`, `MEM`, `MEZ`: owner verified, card coverage incomplete in the V4
  authority; the already-applied canonical rows remain unchanged and exact
  source reconciliation performs no write.

This stricter result is intentional. It turns a hidden source-to-database bypass
into explicit language-index debt.

The expanded catalog suite passed `54/54`; all syntax/import checks and
`git diff --check` passed. The English refresh worker also replayed the current
authority against itself with `changed: false`, `21,520` card facts, `38,939`
printing facts, zero conflicts, and zero unexplained removals.

### Strict Language Gate Artifact Hashes

| Artifact | SHA-256 |
|---|---|
| Production read-only summary | `065143fa765e5930738c14af424393121046c34226447892055c04d97d7fb952` |
| Language Master Index reconciliation | `7b0bd7dbad2c285fe055c48f4268262098f82aa3f70a27f3b3c6102c775392ea` |
| Language Master Index update candidates | `365c1f1d5c83953bd2607496d844626ef64964488175c1bbe6dcc5ceadcc72d9` |
| Canonical promotion candidates | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| English no-change refresh plan | `0490a5c71143758d9ff6e5b4772f149b8325d963ab42f5df65fad8433eeceeec` |
