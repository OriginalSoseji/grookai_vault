# Pricing completion exact-mapping context V1

This adapter prepares a bulk review plan against existing Pokemon canonical parents. It does not create parents, printings or mappings, supply Master authority, publish prices, or grant execution authorization. It performs no database, filesystem, environment, subprocess or network access.

## Frozen operator capture

The separately reviewed one-time operator script is `C:/grookai_vault_agents/pricing_completion_validation_20261013/operator-readback/export_mapping_context_v3.py`. It is not a repository worker or recurring service. Its literal SQL freezes 858 product IDs and 114 source groups from 1,033 ordinary missing-mapping decisions in the independently captured source artifact whose SHA256 is `eb3c73022bbdf8eb705877c9deb4986cb4bf39910b108aa8f7a8ad9d58dc20d9`. No input supplies SQL, identifiers or executable code. The first script revision failed on a nonexistent `card_prints.game` column and accepted no context; V2/V3 use the verified production join `games.id=card_prints.game_id` and `games.code='pokemon'`, preserving earlier artifacts for review. V3 adds complete product `raw_payload` for offline digest and projection verification.

The query reads the selected run `51ce449c-5bdf-4662-8f97-d0190f959384`, publication set `58f535eb-fbfa-40a9-907d-219cbbf541a4`, and source sync `c0fb6b75-ba65-4be3-9a41-e2aa73f08049`. It requires that exact current publication pointer and completed, failure-free full source sync. It uses a repeatable-read, read-only transaction and rollback, 120-second statement timeout, three-second lock timeout, and 180-second subprocess timeout. The existing remote credential remains in the clean remote psql child environment. Verified TLS uses the already reviewed pinned CA. This manual capture does not establish a persistent credential bridge.

The three records are `environment`, `mapping_context`, and `binding`. Context includes:

- All 858 current product rows, complete raw product payloads, `extended_data`, metadata payload hashes, source freshness/routing flags and source group names. The adapter recomputes the existing warehouse canonical payload hash and checks exact product ID, category, group, name and extended-data projections.
- Every TCGPlayer mapping for those products, including inactive rows.
- Every active mapping edge for all 114 groups, aggregated into set consensus. Left joins preserve missing targets and invalid game/set routing in `invalid_target_count`.
- All Pokemon canonical parents, with exact active standard identity and active TCGPlayer mapping counts. Parents are not filtered to matching names/numbers. The census count is independently selected from `card_prints`.
- Any non-Pokemon parent carrying one of the scoped exact embedded IDs, preventing an apparently unique Pokemon match from hiding a cross-game collision.
- All qualification decisions for scoped products, plus all current-run observations for those products, checked as a complete bijection by observation ID and source identity/hash. Nonordinary held and already-published subtype decisions remain available; selecting an ordinary subtype cannot authorize a product-wide mapping over another sibling decision.

Fixed overflow limits fail the capture: 250,000 Pokemon parents, 100,000 group mapping edges, and 10,000 rows each for scoped source mappings, foreign embedded targets, observations and decisions. No partial capture is accepted. Environment maturity checks cover all cards, sets, traits and migrations; they are not a claim that the Master index or all warehouse coverage is complete.

## Offline API

`preparePricingCompletionExactMappingReadbackV1({sourceBytes, contextBytes, expectedSourceSha256, expectedSourceSqlSha256, expectedContextSha256, expectedContextSqlSha256, now, maxCaptureAgeMs?})` accepts original UTF-8 bytes and externally pinned hashes. The age limit defaults to 24 hours and cannot exceed the existing source validator's one-day limit. The context capture must follow the source capture and bind the same source/run/publication. The source receipt is validated by `normalizePricingCompletionOperatorReadbackV1`.

Hashes identify exact bytes. They do not authenticate an operator by themselves; expected result/SQL hashes must come from the independently reviewed operator execution. The receipt explicitly distinguishes the operator's rollback claim from live verification by this offline adapter.

`planPricingCompletionExactMappingContextV1({sourceRows,context,binding})` is the pure core for already validated data and contract tests. It is not a substitute for the byte-bound wrapper at an operator-input boundary.

The new CLI is `scripts/audits/pricing_completion_exact_mapping_context_v1.mjs`. It requires `--source-input`, `--context-input`, `--expected-source-sha256`, `--expected-source-sql-sha256`, `--expected-context-sha256`, `--expected-context-sql-sha256`, and `--out-dir` using `--name=value` syntax. All paths must be absolute. Output must be a new directory disjoint from both input directories; symlink redirections are rejected. It validates both captures before creating output, writes `plan.json`, `product_evidence.json` and `receipt.json`, then writes the hash-bound `accepted_manifest.json` last. There is no apply option. PostgreSQL transaction timestamps retain their original numeric offset and undergo calendar, offset and freshness validation; the adapter does not rewrite them to claim a different capture time.

The result contains `candidates`, `blocked`, `productEvidence`, `reviewBatches`, a census summary, and a provenance receipt. Candidates preserve the exact existing planner's fingerprints; evidence rows are kept separately so the existing apply validator can verify them. `reviewBatches` contain at most 25 candidate fingerprints and are review groupings only. Full-population target collision quarantine runs before batching.

## Eligibility and holds

The adapter reuses `planTcgplayerExactMappingCandidateV1` and `quarantineTcgplayerTargetCollisionsV1`. Printed numbers come only from a unique, nonempty `Number` field in source metadata. It never derives a number from a product name. No new group-label exclusions or guessed set authorities are introduced. Existing product policy still applies.

The adapter additionally holds GameStop-named retailer promos for separate physical-printing authority, any existing source mapping (including inactive rows), noncurrent metadata, changed source routing/names, conflicting printed-number fields, missing observations, other held subtype decisions, foreign embedded-ID collisions and malformed group routing. Direct embedded evidence additionally requires the stored source discriminator `tcgcsv`; absent or different source metadata causes a hold instead of a fallback to consensus.

Ordinary candidates require either exact unique embedded identity or the existing group's unique set consensus plus exact name/printed-number identity, empty target variant, exactly one active standard identity, and no active target TCGPlayer mapping. Special stamp/treatment text remains part of identity normalization.

## Actual execution boundary

This plan is preparation only: `executionAuthorized:false`, `databaseWrites:0`, `masterMappingAuthority:'required_not_supplied'`. The next stage must bind reviewed raw Master printing/source artifacts with `assertMasterMappingBatchAuthority` and use the existing bounded canonical-maintenance path. That executor revalidates source observations, source/target mappings, target identity, publication overlap and frozen fingerprints against live state. Inactive mapping repairs require separate authority; this adapter does not reinterpret them as inserts. A later mapping alone also does not establish a published usable price.

Contract tests cover existing apply-compatible fingerprints, partial censuses, inactive mappings, current metadata, conflicting/missing numbers, held subtypes, GameStop exclusion, embedded-source provenance, target ambiguity, malformed consensus, whole-population collisions and altered observations/decisions. Candidate execution and tests belong in the isolated validation environment, never a privileged host credential context.

## Bulk packaging after review

`buildPricingCompletionMappingAuthorityBatchesV1({candidates,scopes,batchSize})`
in `backend/pricing/pricing_completion_mapping_authority_batches_v1.mjs` accepts
already-reviewed manifests and actual artifact bytes. It validates the complete
selection through the existing Master authority validator before splitting into
deterministic batches of at most 25. Duplicate parents or products across batch
boundaries therefore fail before any batch is produced. Each batch retains its
exact selected JSONL, authority bytes, fingerprints and file hashes.

This pure helper neither creates review records nor converts a proposal into
verified evidence. It has no filesystem, network, database or apply access.
Existing extra assertions for the same reviewed scope stay bound to the original
review. Explicit outside-scope evidence and open leads must remain preserved;
packaging a selected parent relationship does not establish complete set printing
coverage or authorize printing changes. Ten isolated tests cover the 120-row
split, alternate bounds, global duplicates, altered source/review/candidate bytes,
retained scope evidence and deterministic output without input mutation. Object
keys are serialized canonically and scopes are ordered by set UUID; equivalent
key or scope ordering therefore cannot change the produced file hashes.
