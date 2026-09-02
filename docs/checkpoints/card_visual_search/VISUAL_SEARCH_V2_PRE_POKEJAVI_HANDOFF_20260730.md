# Visual Search V2 Pre-PokeJavi Handoff Checkpoint

Date: 2026-07-30

Status: ENGINEERING COMPLETE THROUGH FINAL REVIEW PACKET; HUMAN PARTIAL EXPORT
REQUIRED BEFORE PORTAL DEPLOYMENT

## Producer

- Branch: `agent/visual-search-lab-runtime-fix`
- Engineering implementation SHA:
  `97d4c227a3c98caa444a8e4e9e2560a55489c4b9`
- Draft PR:
  [#118 Build governed Unified Collector Search V2](https://github.com/OriginalSoseji/grookai_vault/pull/118)
- Base branch: `main`
- PR state at checkpoint preparation: mergeable, intentionally draft
- Date/time zone: `2026-07-30` America/Denver

## Why Work Stops Here

All safe engineering work through the final human-calibration packet is
complete. The next required evidence is a human relevance judgment.

Production currently serves the older July 22 review packet. PokeJavi has
unfinished browser-local judgments under that packet's run key. The final V2
packet uses a different run key, so deploying it does not overwrite the old
browser storage, but the new page would no longer provide an ordinary export
control for the old packet.

Therefore the exact stop is:

1. PokeJavi exports the current partial JSONL from the existing production
   portal.
2. The raw export is hashed and archived unchanged.
3. Only then may the final V2 portal bundle be deployed.

No missing judgment may be inferred, defaulted, copied by query ID alone, or
treated as negative.

## Completed Engineering

### Evidence And Corpus

- Existing paid Fact Graphs were reused unchanged.
- Provider calls: `0`.
- Additional AI cost: `$0`.
- Source card-print IDs accounted: `11,000`.
- Searchable artwork groups: `9,532`.
- Searchable printings: `9,702`.
- Coverage gaps: `1,298`.
- Search documents: `38,128`.
- Source evidence rows: `392,050`.
- Searchable evidence rows: `392,046`.
- Deterministic TCG concepts: `34,622`.
- Candidate index entries: `886,245`.
- Searchable Energy rows: `0`.
- Artifact hash mismatches: `0`.

Immutable release:

`C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_rebuild\unified_collector_search_v2\2026-07-30T15-37-33-910Z_release_a88641e94742`

Release key:

`card_visual_search_v2_a88641e94742662e`

### Search Semantics

- Canonical identity, structured visual facts, and governed external evidence
  are combined without changing canonical identity.
- `scene_subject`, `depicted_subject`, `character_representation`,
  `curated_association_unresolved`, and `visual_resemblance_reference` remain
  independent roles.
- Intrinsic resemblance cannot prove a second character.
- Representations require a separate host object.
- Depictions require a separate host surface.
- Multi-character queries require independent same-artwork evidence.
- Counts, relationships, representation forms, and depicted surfaces remain
  evidence-bound.
- Candidate and role-unresolved external evidence cannot enter collector
  results.
- Strict zero states do not silently show partial results.
- Canonical search remains the fallback when visual search is unavailable.

### Real-Corpus Proof

All `12/12` high-risk regressions passed, including:

- `Mimikyu and pika` returns strict zero for the two known false-positive
  Mimikyu cards.
- Pikachu-shaped cookie returns Slurpuff ASC 094.
- Pikachu plush and poster require their correct roles.
- An unresolved Pikachu pin remains strict zero.
- Pokemon holding a Poke Ball binds the object to the subject.
- Three-or-more-Pokemon search uses visible count evidence.
- Wingull sky, cloud, tree, and shadow boundaries remain separate.
- Marowak standing remains a pose fact, not a second subject.

### Signed-In Collector Surface

- Unified Collector Search V2 is integrated behind a signed-in feature flag.
- Result groups use collector-facing explanations.
- The evidence viewer opens the complete self-hosted image and full evidence.
- Correction actions use a new signed-in, user-scoped endpoint.
- The endpoint validates UUID, query, correction type, evidence count, and
  evidence size.
- It hashes the evidence snapshot server-side.
- It calls only `submit_card_visual_search_correction_v2`.
- It cannot use service-role access or modify active releases/assertions.
- The persistence migration remains unapplied, so no correction can currently
  write production state.

### CI Repair

Three branch-caused GitHub failures were repaired:

1. The immutable artifact-root escape test now uses platform-native absolute
   paths on Windows and Linux.
2. The missing bounded visual-search correction route is implemented and
   explicitly allowlisted by `.gitignore`.
3. The pricing auth contract now recognizes visual-search authentication while
   preserving `pricingRequested && Boolean(userId)` as the pricing boundary.

GitHub Actions run
[30561833037](https://github.com/OriginalSoseji/grookai_vault/actions/runs/30561833037)
passed both `runtime-protection` and `binder-rollout-windows` on repair SHA
`37b7e828c4cbcdfbc5aaa79e7b85e2db0b4c7b95`.

On final engineering SHA
`97d4c227a3c98caa444a8e4e9e2560a55489c4b9`:

- [Runtime Protection 30562367506](https://github.com/OriginalSoseji/grookai_vault/actions/runs/30562367506):
  passed.
- [Contracts Drift Gate 30562367219](https://github.com/OriginalSoseji/grookai_vault/actions/runs/30562367219):
  passed.
- [Guard: No Legacy Keys 30562367271](https://github.com/OriginalSoseji/grookai_vault/actions/runs/30562367271):
  passed.
- [Mobile web native parity 30562367645](https://github.com/OriginalSoseji/grookai_vault/actions/runs/30562367645):
  passed.

### Final Reviewer Packet

Immutable packet:

`C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_rebuild\unified_collector_search_v2\reviewer_packet\2026-07-30T15-29-41-063Z_packet_03d35aae5757`

- Packet run key:
  `03d35aae57572fdc183033fd682326bc1751506d098c2c2afc7f7543f7a2ba35`
- Packet-producing SHA:
  `9d2e6dd91fd567762aa4e1dddf9c5457d44dceb1`
- Calibration queries: `200`.
- Holdout queries exposed: `0`.
- Top-result slots: `933`.
- Required saved records/images: `678`.
- Resolved saved records/images: `678/678`.
- Missing/unreadable source records: `0`.
- Remote images fetched during packet build: `false`.
- Permanent packet artifact hashes: `5/5` verified.
- Official status: `awaiting_human_judgments`.

The final packet is bundled in the authenticated review portal as
`CARD_VISUAL_SEARCH_REVIEW_PORTAL_BUNDLE_V2`:

- Source HTML SHA-256:
  `45b01a7024319ba17d868fdea8edf90997f003e5d59e5988d19a023519c4d751`
- Brotli bundle SHA-256:
  `04a71e5808872ab45f9e615df2fda4ed7f936f26f9ee8673b99918d22ee98435`
- Bundle bytes: `1,232,819`.
- Browser-local storage only: `true`.
- JSONL export only: `true`.
- Server writes: `false`.

The bundle contract independently decompresses the artifact, verifies both
hashes and byte counts, parses the embedded packet, proves `200` calibration
queries, proves `0` holdout queries, reconciles all `678` saved records/images,
and rejects mutation-capable browser code.

## Production Portal Transition

Current production packet:

- Bundle version: `CARD_VISUAL_SEARCH_REVIEW_PORTAL_BUNDLE_V1`.
- Packet run key:
  `13bc0f5043d574246c739c89953b43c07df991d717ff1bdd39f991ba24cc5f0e`.
- Saved visual records: `753`.
- PokeJavi progress: partial and browser-local.

Prepared replacement:

- Bundle version: `CARD_VISUAL_SEARCH_REVIEW_PORTAL_BUNDLE_V2`.
- Packet run key:
  `03d35aae57572fdc183033fd682326bc1751506d098c2c2afc7f7543f7a2ba35`.
- Saved visual records: `678`.
- Deployment status: not deployed.

The two storage keys are independent. The old data remains in PokeJavi's
browser, but the old portal must remain available until he exports it.

## Verification

- Targeted CI-repair contracts: `21/21` passed.
- Visual-search contract family after repair: `192/192` passed.
- Final portal integrity contracts: `3/3` passed.
- Full repository contract suite: `1,183/1,183` passed.
- Web TypeScript: passed.
- Web ESLint: passed with zero warnings.
- Release secret guard: passed.
- `git diff --check`: passed.
- PR mergeability: mergeable at engineering SHA.

Not run:

- Production migration/RLS smoke tests, because the migration was not applied.
- Flutter tests, because this change does not alter Flutter.
- Sealed holdout, because human calibration is incomplete.

## Current Truths

- Production collector visual search is not active.
- The final V2 reviewer bundle is in draft PR #118, not production.
- Production still serves the old read-only reviewer packet.
- PokeJavi's unfinished judgments have not been imported or scored.
- The sealed 50-query holdout remains unexecuted.
- Numeric release thresholds remain unlocked.
- The private persistence migration remains unapplied.
- No visual-search release is loaded or active in production.
- No embeddings were generated.
- No database writes, approvals, or canonical mutations occurred.
- Pricing work from `main` was merged into this branch with zero overlapping
  files in the audited branch/main change sets.

## Human Dependency

PokeJavi is now required for two actions:

1. Export the existing old-packet partial JSONL before portal deployment.
2. After the V2 bundle is deployed, complete the primary review of all `200`
   final calibration queries and export the final JSONL.

For difficult families, an independent second reviewer is still required:

- subject role;
- multi-subject;
- object/count;
- representation/cameo;
- alias;
- printing expansion;
- negative/zero result.

The founder/admin must adjudicate every disagreement.

## Exact Resume Sequence

1. Receive PokeJavi's old-packet partial JSONL.
2. Record its original filename, byte count, SHA-256, received time, reviewer
   identity, packet run key, and source commit.
3. Archive the raw file unchanged.
4. Validate it against the old packet without filling missing judgments.
5. Compare old and V2 packet rows by query, artwork group, result rank,
   printing expansion, image hash, packet version, and result semantics.
6. Produce a carry-forward proposal; do not apply it automatically.
7. Founder confirms the exact carry-forward rows.
8. Review and merge PR #118.
9. Verify the production deployment serves V2 bundle/run headers.
10. PokeJavi signs in at `/review/visual-search` with the existing Grookai
    login.
11. PokeJavi completes all remaining final-packet primary judgments and exports
    JSONL.
12. Hash, archive, and validate the final primary submission.
13. Obtain the required independent difficult-family review.
14. Produce and complete the adjudication queue.
15. Run official calibration metrics only after all `200` final judgments
    reconcile.
16. Review global and per-family precision, recall, nDCG, MRR, zero-result
    accuracy, unsupported-match rate, role confusion, count violations,
    canonical-filter violations, printing-expansion errors, evidence validity,
    duplicate artwork, and Tier A/B distribution.
17. Propose and freeze numeric release thresholds from human evidence.
18. Freeze parser, projection, ranker, thresholds, and release commit.
19. Execute the sealed `50`-query holdout exactly once.
20. If the holdout passes, open a separate migration-apply approval gate.
21. Apply and read back schema, functions, triggers, grants, RLS, and the
    absence of an active pointer.
22. Load one immutable release without activation and reconcile every row,
    source hash, evidence reference, and duplicate count.
23. Validate service-only RPC behavior and rollback.
24. Optionally run the bounded embedding canary for soft semantic ranking only.
25. Authorize a separate active-pointer canary and signed-in feature rollout.

## What Must Never Be Broken

- Canonical identity remains separate from derived visual intelligence.
- Existing paid Fact Graphs are not regenerated for this 10k corpus.
- Raw observations remain the evidence backbone.
- Scene subjects, depictions, representations, unresolved associations, and
  resemblance remain role-isolated.
- Candidate evidence never reaches collector results.
- Vectors cannot prove identity, role, count, relationship, or printing.
- Human partial work is never completed by inference.
- Holdout results cannot tune the frozen candidate.
- Migration apply, load, validation, activation, and public access remain
  separate gates.
- The review portal remains read-only and browser-local.

## Explicit Next Gate

PokeJavi exports the current production portal's partial JSONL before any V2
portal deployment. Stop until that raw file is received. Do not merge/deploy
the replacement bundle, execute the holdout, apply the migration, load a
release, generate embeddings, or activate collector visual search.
