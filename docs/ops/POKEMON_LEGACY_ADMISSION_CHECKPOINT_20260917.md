# Pokemon Legacy Admission Repair

Date: 2026-09-17
Status: Local implementation and loopback verification; not production deployment.

## Evidence

A real PokemonAPI enrichment CLI dry-run attempted an external_mappings POST
while resolving an unmapped parent. It swallowed the rejected write and exited
successfully. The reproduction used a local HTTP fixture that rejected all writes;
no production request or accepted mutation occurred. Preserved receipt:
`C:/grookai_vault_operator_artifacts/tcgdex_mapping_review_20260917/pokemonapi-dry-run-gap-v1.json`.

The older PokemonAPI normalizer did not parse dry-run. Legacy new-set apply could
reach raw acquisition before invoking that unsafe child. Its existing printing
manifest checks were real but did not make the complete child chain atomic.

## Repair

- Enrichment, mapping backfill and TCGdex normalization require explicit dry-run
  admission before client setup, checked again after environment loading.
- Limit defaults to 50, accepts only 1..500; unknown/duplicate arguments and all
  apply spellings fail. TCGdex supports explicit set and kind filters.
- The shared implicit PokemonAPI mapping writer throws before touching a client.
  Enrichment no longer invokes it, ignores inactive mappings and propagates read
  errors. Existing matches and number-based candidates are not identity authority.
- The old PokemonAPI normalizer rejects both direct and imported execution. The
  remote import wrapper rejects before staging; new-set apply rejects before
  manifest loading/acquisition. Historical bodies are preserved, not authorized.
- TCGdex reviews one bounded selection per kind with stable raw-ID order. Every
  selected conflict/error counts once; unchanged pending rows cannot loop. The
  all-kind limit is shared, sets first. Duplicate/missing IDs fail before review.
- Every selected TCGdex row preserves raw payload, finish hints, candidate ID
  when present and explicit review-only outcome. New parents also retain evidence.
  Hints are not converted into supported finishes. Summary counters say reviewed,
  not normalized. No raw status, conflict, admin log, trait or canonical writes.
- Backfill reports candidates, not completed mappings, retains unresolved source
  rows and rejects duplicate/missing selected IDs. The runtime catalog no longer
  advertises the retired new-set apply as a live enforcement worker.

## Verification And Remaining Work

Focused tests invoke actual CLIs against synthetic loopback HTTP fixtures, reject
every non-GET request, and check entry admission, read failures, source payloads,
finish hints, duplicate IDs, set/card aggregate limits and conflict termination.
Full release checks and PR review are still required. Existing clean rows have not
been reprocessed in production by these tests.

Interim review-only operation is not the final automated ingestion system. Fresh
reviewed Master Index writers must replace each needed lane; provider hints cannot
be promoted by giving these legacy commands new approvals. Audit actual deployed
callers/versions without overwriting the divergent MEE runtime. Then verify scheduled
reconciliation and exception notifications. Historical catalog adjudication,
dependency-safe corrections and collector/Vault checks remain outstanding.

Preserve McDonald's frozen production executor and its exact authority requirement.
No production DB, Storage, pricing, ownership, visibility or deployment changes
belong to this repair. Preserve stash `8190180b15d730614ff91209c1730b44bd6130ad` as
history; it was applied once to this branch after fast-forwarding the PR486 fix.
