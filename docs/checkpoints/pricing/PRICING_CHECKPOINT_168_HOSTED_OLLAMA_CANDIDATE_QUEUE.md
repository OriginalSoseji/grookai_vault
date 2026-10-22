# Pricing Checkpoint 168: Hosted Ollama Candidate Queue

## Status

`IMPLEMENTED - LIVE HOSTED AND LOCAL RECEIPTS PENDING`

## Problem

The corrected V1.5 completion artifact from workflow run `39851415148` contains
13,162 in-scope identity products: 12,892 Magic and 270 Pokemon. The local
Ollama task still downloaded the Pokemon exact planner's `blocked.jsonl` and
opened a direct PostgreSQL connection before inference. That connection has
timed out continuously while the workstation routes port 5432 through Norton
VPN. The task therefore exited before Ollama ran and could not consume Magic.

## Repair

The hosted pricing-completion worker now performs candidate enrichment inside
its existing read-only database boundary. It:

- reads the deduplicated, V1.5-scoped cross-category product queue;
- restores the unique TCGPlayer printed-number field from source warehouse
  evidence;
- keeps Magic and Pokemon candidates in their separate
  `mtg_eng_paper_print` and `pokemon_eng_standard` identity domains;
- uses unique mapped-group set consensus when available and exact normalized
  name lookup otherwise;
- excludes already-mapped targets, non-parent variants, ambiguous identity
  rows, and likely sealed products; and
- emits only rows that have at least one bounded real catalog candidate.

The local V2 PowerShell runner downloads
`ollama_identity_candidate_queue.jsonl` over GitHub HTTPS. It no longer reads
production PostgreSQL, hashes each hosted input, resumes completed 500-row
batches, runs the frozen loopback model sequentially, reconciles duplicate
targets, and unloads the model when it finishes.

## Boundaries

- Hosted enrichment is repeatable-read and read-only.
- The local task has no database connection or secret dependency.
- Candidate selection remains advisory and never grants mapping authority.
- Ollama cannot write canonical identity, mappings, prices, publication state,
  or customer state.
- Every retained lead still requires deterministic validation and the existing
  governed mapping and pricing release path.

## Verification Gate

After merge, dispatch the pricing-completion workflow from the exact merged
commit. Reconcile the combined and per-category candidate queue hashes and row
counts. Then point `Grookai Ollama Pricing Triage` to the merged V2 runner,
execute one manual task cycle, and retain its receipt. The repair is complete
only when the hosted workflow succeeds and the local task advances beyond its
former candidate-enrichment timeout.
