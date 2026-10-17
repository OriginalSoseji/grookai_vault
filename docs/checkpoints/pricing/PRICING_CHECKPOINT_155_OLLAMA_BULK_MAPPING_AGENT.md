# Pricing Checkpoint 155: Ollama Bulk Mapping Agent

## Status

`LOCAL BULK AGENT RUNNING - READ-ONLY REVIEW QUEUE VERIFIED`

## Outcome

The local `grookai-card-triage:4b` worker now processes the full blocked
TCGPlayer product backlog instead of stopping at 100-row advisory chunks. A
read-only enrichment phase searches active, unmapped Grookai standard parents
and supplies at most 20 real catalog candidates per product. The local model
can select only from that bounded list.

The first V2 run processed the 481-product backlog from GitHub completion run
`38991474242` in one batch. It made 128 sequential local model calls, returned
123 leads and 5 ambiguous results, produced zero model errors, and unloaded the
model when complete. Batch reconciliation retained 83 unique target leads and
held 40 suggestions across 17 duplicate targets.

The Windows scheduled task `Grookai Ollama Pricing Triage` is repaired and polls
every five minutes from `C:\gv_ollama_bulk_mapper_20261017`. The hosted
production backlog measurement refreshes every fifteen minutes. Unchanged input
SHA-256 values are a no-op, and the task mutex prevents overlapping local runs.
Its retained evidence is under
`C:\grookai_vault_operator_artifacts\pokemon_pricing_repair_20261012\ollama\continuous`.

## Pipeline

1. Download the latest successful pricing-completion artifact.
2. Reuse an unchanged completed input by SHA-256.
3. Enrich blocked rows from a repeatable-read, read-only production transaction.
4. Exclude mapped targets, nonstandard parents, child variants, and likely
   sealed products before inference.
5. Run the 4B loopback model sequentially across the complete enriched input.
6. Reconcile target selections across the entire batch and hold collisions.
7. Emit unique review, manual review, collision hold, and summary artifacts.

## Boundaries

The agent has no mapping writer, canonical writer, publication writer, or
customer-state path. Missing printed coordinates may enter advisory review only
after catalog enrichment finds bounded candidates. Model confidence never grants
mapping authority. Collision-free leads still require the existing exact
authority package, rollback proof, production apply, full pricing shadow, and
independent readback.

## Verification

- Focused candidate enrichment, triage, and reconciliation contracts: 15 passed.
- Repository contract suite: 7,951 passed, 0 failed, 10 skipped.
- Scheduled task manual run: exit code 0.
- First V2 local run: 481 rows, 128 model calls, 0 model errors.
