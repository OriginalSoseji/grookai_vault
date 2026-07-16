# CARD_VISUAL_LANGUAGE_V1_HUMAN_REVIEW_GATE_PREP_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

Visual Language V1 is locked, and the first bounded database apply batch wrote `25` private visual-description rows with `22 needs_review`, `3 pending`, and `0 approved`.

The exact next gate was human review of those 25 written rows before any approval, embedding, app-facing read, semantic search, or downstream integration.

## Problem

The review gate needs a stable, row-level packet that a human reviewer can use to evaluate the generated descriptions against the source artwork and Grookai Visual Language rules without accidentally changing database state.

## Risk

If review preparation updates database rows, approves generated output, creates embeddings, or exposes unreviewed descriptions, the derived-intelligence boundary is broken before human judgment is recorded.

## Decision

Create a read-only human-review packet from the bounded apply run and a fresh DB snapshot.

The packet records actual `card_print_visual_descriptions.id` values, image keys, generated descriptions, semantic tags, flags, policy results, and blank decision fields. It does not perform any database writes.

## Alternatives Rejected

- Approve the three pending rows immediately: rejected because even safe pending rows need explicit human approval in a later gate.
- Update `needs_review` rows during packet generation: rejected because review preparation must be read-only.
- Generate embeddings for pending rows: rejected because embeddings require explicit approved rows.
- Build an app-facing review UI now: rejected because the bounded next step is a durable review packet, not a new product surface.
- Integrate semantic search, Taste Engine, Listing Resolver, or Grookai Signature: rejected as later gates.

## Migration Applied

No migration was applied.

Existing private visual-description schema remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## Current Truths

- Source bounded apply run key: `fede8846074f414722b0a967e52fff7ba1eaeee18d2fe4bea6c8686f9712f1c8`.
- Source bounded apply run ID: `3e7f390a-e372-41ac-be73-b33e94918a8b`.
- Review packet rows snapshotted: `25`.
- Status counts at snapshot: `22 needs_review`, `3 pending`, `0 approved`, `0 rejected`.
- Branch coverage remains exact: `5` Pokemon, `5` Trainer, `5` Stadium, `5` Energy, and `5` Item / Tool / Supporter.
- Embedding fields remain empty for all 25 rows.
- The review packet is read-only and does not mutate review status.

## Token And Cost Result

No OpenAI calls were made in this gate.

The source bounded apply batch remains:

- input tokens: `682128`
- output tokens: `9974`
- total tokens: `692102`
- estimated cost: `$0.1083036`
- average estimated cost per validated card: `$0.00433214`

## Invariants

- Human review preparation is read-only.
- Every snapshotted row is still `pending` or `needs_review`.
- No snapshotted row is `approved`.
- No snapshotted row is `rejected`.
- No embedding fields are present.
- No app-facing/public read surface is introduced.
- The packet records row IDs for later explicit review decisions.
- Review decisions must be applied only in a separate bounded gate.

## Why The Visual Layer Remains Derived Intelligence

The packet contains model-generated descriptions, tags, attributes, quality flags, and policy results. These are review inputs, not canonical identity truth. A human reviewer may accept, revise, reject, or leave rows pending, but the generated content does not become approved intelligence until a later explicit review-decision apply gate records that decision.

## What Must Never Be Broken

- Do not approve rows from this packet automatically.
- Do not infer approval from `pending`.
- Do not generate embeddings before explicit approval.
- Do not expose unreviewed rows to app-facing surfaces.
- Do not treat generated visual text as canonical identity, printing, rarity, pricing, or collector-taste truth.
- Do not integrate Grookai Signature, Taste Engine, Listing Resolver, or semantic search from this gate.

## Tests And Readbacks

- Fresh DB read-only snapshot: pass, `25` rows snapshotted.
- Review boundary readback: pass, `0 approved`, `0 rejected`, `0` rows with embedding fields.
- Source apply invariants preserved: pass.
- `git diff --check` - pass.
- Full repository contract suite was not run because this gate only generated review artifacts and did not change code or schema.

## Artifacts

- Review gate directory: `docs/audits/card_visual_language_v1_human_review_gate/2026-07-16Tbounded_apply_25_review_packet`
- Review packet: `docs/audits/card_visual_language_v1_human_review_gate/2026-07-16Tbounded_apply_25_review_packet/HUMAN_REVIEW_PACKET.md`
- Preparation report: `docs/audits/card_visual_language_v1_human_review_gate/2026-07-16Tbounded_apply_25_review_packet/HUMAN_REVIEW_GATE_PREPARATION_REPORT.md`
- DB snapshot: `docs/audits/card_visual_language_v1_human_review_gate/2026-07-16Tbounded_apply_25_review_packet/review_packet_snapshot.json`
- Decision template: `docs/audits/card_visual_language_v1_human_review_gate/2026-07-16Tbounded_apply_25_review_packet/review_decisions_template.jsonl`
- CSV queue: `docs/audits/card_visual_language_v1_human_review_gate/2026-07-16Tbounded_apply_25_review_packet/review_queue.csv`
- Diff check output: `docs/audits/card_visual_language_v1_human_review_gate/2026-07-16Tbounded_apply_25_review_packet/diff_check_output.txt`
- Hashes: `docs/audits/card_visual_language_v1_human_review_gate/2026-07-16Tbounded_apply_25_review_packet/permanent_artifact_hashes.json`

## Explicit Next Gate

A human reviewer must fill the decision template or otherwise provide explicit row-level decisions.

Only after explicit decisions exist should a separate bounded review-decision apply gate update database review statuses. That later apply gate must still not generate embeddings or expose app-facing reads unless explicitly authorized.
