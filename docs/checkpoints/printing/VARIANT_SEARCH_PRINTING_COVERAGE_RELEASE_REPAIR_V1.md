# Variant Search And Printing Coverage Release Repair V1

## Context

Variant-aware search and exact-copy media controls needed a bounded release repair across web and Samsung. The concrete acceptance query was `Pikachu ex Surging Sparks 057 Play Pokemon stamp holo`.

The work ran in the isolated worktree `C:\grookai_vault_variant_search_release_repair` on `fix/variant-search-printing-coverage-v1`. The dirty pricing/security worktree was not modified.

## Problem

- Structured variant search could return the correct unique row while labeling it approximate.
- Residual text filtering did not include enriched set names, allowing an unrelated card numbered `057` to survive candidate discovery.
- Flutter did not recognize the resolver's `DIRECT_MATCH` state.
- Catalog labels could render duplicate finish text.
- Existing exact-copy media management existed, but active owned-copy rows did not open it.
- The coverage audit treated JustTCG-only finish labels as repair-authorizing evidence, contrary to the frozen printing contract.
- The target child printing initially carried discovery-source provenance instead of independently corroborated catalog provenance.

## Risk

The user could see an unrelated printing, an exact match presented as uncertain, or a card tile without enough variant context. A broader automatic repair could also create child printings from reference-only evidence and weaken canonical printing governance.

## Decision

- A unique structured variant result is `DIRECT_MATCH` only when all structured labels were applied and a variant constraint is present.
- Final structured text filtering runs after set metadata enrichment and includes `set_name`.
- Flutter maps `DIRECT_MATCH` to its strong-match state.
- Display labels are de-duplicated case-insensitively without removing distinct variant context.
- Owned-copy rows open the existing exact GVVI media manager.
- Only TCGdex and PokemonAPI are automatic printing-authority lanes in this audit.
- JustTCG-only finish evidence remains reviewer-only and never makes a row repair-eligible.
- The target Holo child remains in place; only its provenance was corrected after exact evidence readback.

## Alternatives Rejected

- Broad fuzzy-result promotion was rejected because multiple or partially applied matches must remain approximate.
- Creating child printings from variant names, images, or JustTCG labels alone was rejected.
- Replacing the target child or changing its parent canonical identity was rejected.
- Keeping copy media controls hidden behind inactive rows was rejected because it made the governed GVVI workflow unreachable.

## Database Apply And Readback

Target parent:

- `card_print_id`: `1a243678-bb93-4845-b979-b43a74d8a007`
- `gv_id`: `GV-PK-SSP-057-PLAY-POKEMON-STAMP`

Target child:

- `card_printing_id`: `0c231887-95a8-4f86-9c60-91b36e56ac2f`
- `printing_gv_id`: `GV-PK-SSP-057-PLAY-POKEMON-STAMP-HOLO`
- `finish_key`: `holo`

Evidence asserted before the provenance write:

- master-verified finish fact `surging sparks|57|pikachu ex|holo`
- exact TCGplayer product `648703`
- exact Holofoil SKU `8882935`
- canonical parent and child IDs unchanged

The in-place update changed only the provenance lane from `justtcg` to `tcgplayer_catalog_corroborated`. Immediate service-client readback proved the corrected source and evidence reference. No parent identity was changed and no child was deleted or replaced.

## Cross-Client Proof

Web resolver proof:

- query returned exactly one row
- `meta.resolverState` was `DIRECT_MATCH`
- zero unapplied labels
- exact parent and child GV-IDs matched
- finish discriminator was `Holo`
- representative-image disclosure remained explicit

Samsung proof on `SM_S908U`:

- latest debug APK installed from the repaired source
- same query returned one card
- no approximate-match banner appeared
- title rendered `Pikachu ex · Holo`
- subtitle rendered `Surging Sparks • #057 • Holo`
- representative-image disclosure remained visible

## Exact-Copy Media Proof

A temporary exact copy was used only to prove the full media lifecycle:

- instance `2030695b-2f37-4102-a641-897ce40771bc`
- GVVI `GVVI-065CAB28-001331`
- front upload round-tripped with `image_display_mode=uploaded`
- removing the upload cleared both image paths and restored canonical mode
- the temporary copy was archived through the app
- final front and back storage object counts were both zero

No temporary user media or active test copy remains.

## Current Truths

- `card_prints` remains canonical identity.
- `card_printings` remains child printing identity.
- Variant search can route an exact natural-language printing query without conflating an unrelated same-number card.
- Every displayed result retains its variant/finish discriminator.
- A representative image never claims to be exact variant imagery.
- Exact-copy media mutations remain owner-scoped and use the existing GVVI workflow.
- JustTCG remains discovery/reference evidence, not a lawful automatic printing-identity authority.

The last complete full coverage audit recorded:

- special parents: `3,858`
- governed child ready: `829`
- no source evidence: `2,406`
- reference-only review required: `563`
- public identity incomplete: `60`
- automatic repair candidates: `0`

The audit was regenerated after the authority-policy change. A later rerun attempt after the single provenance correction was blocked by a direct PostgreSQL network timeout; the targeted service-client readback succeeded and is the authority for that one-row change.

## Invariants

- Never synthesize a child printing from a variant label or representative image alone.
- Never use JustTCG-only evidence to authorize an automatic child write.
- Never change canonical parent identity to make search easier.
- Never hide or collapse the selected printing/finish on a card surface.
- Never present representative imagery as an exact variant image.
- Never leave smoke-test user media or active collection rows behind.

## Verification

- focused Node contracts: `22/22` passed
- exact-copy ownership/image contracts: `3/3` passed
- Flutter analyzer on modified mobile files: passed with no issues
- web TypeScript check: passed
- `git diff --check`: passed
- Samsung exact search smoke: passed
- exact-copy upload/remove/archive cleanup: passed
- service-client provenance apply/readback: passed

## Artifacts

- `docs/audits/special_variant_printing_coverage_v1/special_variant_printing_coverage_v1.json`
- `docs/audits/special_variant_printing_coverage_v1/special_variant_printing_coverage_v1.md`
- `docs/audits/special_variant_printing_coverage_v1/pikachu_ssp057_printing_apply_v1.json`
- `docs/audits/special_variant_printing_coverage_v1/pikachu_ssp057_printing_provenance_apply_v1.json`
- `docs/audits/special_variant_printing_coverage_v1/pikachu_ssp057_printing_provenance_dry_run_v1.json`
- `docs/audits/variant_search_printing_release_repair_v1/cross_client_smoke_v1.json`
- `docs/audits/variant_search_printing_release_repair_v1/samsung_final_variant_search.png`
- `docs/audits/variant_search_printing_release_repair_v1/samsung_uploaded_copy_pass.png`
- `docs/audits/variant_search_printing_release_repair_v1/artifact_hashes.sha256`

## What Must Never Be Broken

Search confidence must follow evidence, not merely row count. Printing creation must follow authoritative finish evidence, not discovery labels. Every card shown in either client must preserve enough parent and child identity to prevent variant confusion.

## Explicit Next Gate

Review and merge this isolated branch, then deploy the web/mobile changes through the normal release pipeline. Separately queue the `563` reference-only printing gaps for source acquisition or human confirmation; do not mass-apply them. Exact variant imagery for the target remains a future image-acquisition gate and must not block use of the governed printing identity.
