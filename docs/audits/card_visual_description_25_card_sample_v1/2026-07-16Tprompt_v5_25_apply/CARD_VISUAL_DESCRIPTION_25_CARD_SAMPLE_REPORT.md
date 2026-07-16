# Card Visual Description 25-Card Sample Report

Date: 2026-07-16

Branch: `feature/card-visual-description-agent`

Status: COMPLETE_25_CARD_SAMPLE_GATE

## Result

The Prompt V5 25-card OpenAI sample completed with private review rows only.

Final DB readback:

- requested sample cards: `25`
- current visual description rows read back: `25`
- missing current rows: `0`
- review statuses: `24 pending`, `1 needs_review`
- approved rows: `0`
- embedding rows: `0`
- embedding metadata rows: `0`

The one `needs_review` row is:

- `Fairy Garden`
- GV-ID: `GV-PK-WCD-2014-CRAZY_PUNCH-13-XY-117-FAIRY_GARDEN`
- card_print_id: `434b3e53-e42b-43bc-9ede-f649494a5e1c`
- quality flag: `potential_overconfident_ambiguous_setting`

## Self-Hosted Image Resolver Repair

The first exact-list apply exposed a worker bug: self-hosted canonical images were treated as public HTTP URLs and returned `image_http_400`.

The app already has canonical image API routes:

- `/api/canon/image?path=...`
- `/api/canon/images`
- `/api/canon/cards/[gv_id]/image`

Those routes read constrained warehouse image paths from the private Supabase bucket `user-card-images`.

For the offline worker, the safer implementation is to reuse the same constrained storage rule directly instead of requiring a running Next server. The agent now:

- accepts only warehouse canonical image prefixes:
  - `warehouse-derived/self-hosted-images-v1/`
  - `warehouse-derived/image-truth-v1/`
- requires `image_source = identity` before using canonical storage paths
- downloads from Supabase storage bucket `user-card-images`
- records `image_source`, `image_source_key`, storage path attempts, and image metadata in artifacts
- keeps external HTTP and TCGdex high-image fallback behavior

Final image source readback:

- `image_path`: `22`
- `image_url`: `3`

## Runs

Initial exact-list apply:

- run key: `ca1c3bd33785259e20d708b0fb933b13af00fddbfb0e91f8c1115222419d9e5f`
- artifact directory: `docs/audits/card_visual_descriptions/2026-07-16T05-17-46-624Z_apply_ca1c3bd33785`
- eligible: `25`
- attempted: `4`
- validated: `3`
- failed: `1`
- skipped: `21`
- inserted: `3`

Remaining 22-card apply after storage resolver repair:

- run key: `12bc4fc1b986107daea29ee9b445e46150a148bc0e308432499a0f24141a8df3`
- artifact directory: `docs/audits/card_visual_descriptions/2026-07-16T05-25-48-543Z_apply_12bc4fc1b986`
- eligible: `22`
- attempted: `22`
- validated: `22`
- failed: `0`
- skipped: `0`
- inserted: `22`

## Token And Cost Result

Pricing snapshot:

- model requested: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- input per million: `$0.15`
- output per million: `$0.60`
- cached input per million: `$0.075`
- image cost rule version: `gpt-4o-mini-standard-2026-07-15`

Combined run usage:

- request count: `26`
- retry count: `0`
- input tokens: `715573`
- output tokens: `12913`
- total tokens: `728486`
- estimated cost: `$0.11508375`

Average per validated description:

- input tokens: `28622.92`
- output tokens: `516.52`
- total tokens: `29139.44`
- estimated cost: `$0.00460335`

Projected costs at this pricing snapshot:

- 500 cards: `$2.301675`
- 1,000 cards: `$4.60335`
- full eligible catalog from unbiased plan, `53227` cards: `$245.02251045`

## Schema, RLS, And Boundary Proof

DB readback artifact:

```text
docs/audits/card_visual_description_25_card_sample_v1/2026-07-16Tprompt_v5_25_apply/10_prompt_v5_25_db_rls_boundary_readback.json
```

Readback proved:

- `card_visual_description_runs` has RLS enabled.
- `card_print_visual_descriptions` has RLS enabled.
- no RLS policies exist on either private table.
- grants are only to `postgres` and `service_role`.
- `anon`, `authenticated`, and `PUBLIC` have no table grants.
- app-facing card search views do not reference `card_print_visual_descriptions` or `card_visual_description_runs`.
- `card_prints` has no visual, description, semantic, or embedding boundary columns.

## Tests

Focused syntax and contract checks:

```text
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
```

Results:

- syntax check: passed
- contract tests: `9 passed`, `0 failed`

Preserved outputs:

```text
docs/audits/card_visual_description_25_card_sample_v1/2026-07-16Tprompt_v5_25_apply/11_node_check_output.txt
docs/audits/card_visual_description_25_card_sample_v1/2026-07-16Tprompt_v5_25_apply/12_card_visual_contract_test_output.txt
```

The full contract suite was not run for this isolated Node/database gate. Repository convention did not require it for this prompt/sample/storage-resolver change, and prior full-suite attempts on this branch are known to be blocked by unrelated existing `apps/web` typecheck failures.

## Invariants Held

- no generated row was approved
- no embeddings were generated
- no semantic search was built
- no Taste Engine integration was added
- no Listing Resolver integration was added
- no canonical identity, pricing, or app-facing boundary changed
- no unattended timer was enabled
- no additional schema migration was created or applied for this gate

## Required Artifacts

- initial plan output: `01_prompt_v5_25_card_plan_output.txt`
- diverse sample manifest: `03_diverse_sample_manifest.json`
- exact sample IDs: `04_diverse_sample_ids.txt`
- exact sample DB verification: `05_diverse_sample_db_verification.json`
- exact-list plan output: `06_exact_list_plan_output.txt`
- exact-list eligible cards: `07_exact_list_plan_eligible_cards.jsonl`
- initial apply output: `08_prompt_v5_25_card_apply_output.txt`
- remaining 22-card apply output: `09_prompt_v5_remaining_22_apply_output.txt`
- DB/RLS/boundary readback: `10_prompt_v5_25_db_rls_boundary_readback.json`
- syntax output: `11_node_check_output.txt`
- contract test output: `12_card_visual_contract_test_output.txt`
- artifact hash manifest: `13_artifact_hashes.json`
- all generated descriptions review file: `CARD_VISUAL_DESCRIPTION_25_DESCRIPTIONS.md`

## Decision

The 25-card Prompt V5 sample is successful enough to proceed to human review. The generated rows remain private derived intelligence, not canonical truth.

## Exact Next Gate

Human-review the 25 generated current rows, especially the `needs_review` Fairy Garden row and any output with speculative background or non-creature card interpretation issues.

Do not approve rows, generate embeddings, build semantic search, expose app-facing reads, or integrate Grookai Signature until the human review gate explicitly accepts quality and chooses the next bounded action.
