# Pricing Production V1 Surface Release Readiness

## Status

`CODE_READY_FOR_INTEGRATION_REVIEW`

Production release is still blocked by the active replacement canary through
`2026-08-01T20:26:44.820Z`. No post-canary migration, deployment, publication
expansion, or anonymous access change occurred in this work.

## Scope

This readiness pass audited the 17 frozen web and Flutter pricing surfaces,
closed client contract gaps, made surface ownership executable, and prepared
the post-canary release sequence.

The work was isolated in:

- branch: `agent/pricing-v1-surface-readiness`
- base pricing SHA: `2587bd8ca9ae626306226fd0d5f2143cb38a112a`
- active production runtime SHA:
  `ffb2513fd530930dbfaee714b84df2358f7eaafc`

## Read-Only Production Truth

Read at `2026-07-29T21:39:43Z` from
`v_market_price_current_v1` using a GET request:

| Check | Result |
| --- | ---: |
| Current rows | 100 |
| Positive USD rows | 100 |
| TCGPlayer Market rows | 100 |
| Fresh rows | 100 |
| Missing provenance | 0 |
| Distinct run IDs | 1 |
| Distinct publication sets | 1 |
| Database writes | 0 |

This confirms the current database publication remains healthy. It is not a
substitute for the replacement 72-hour observer, deployed client proof, or
authenticated-role database verification.

## Findings Repaired

1. Web and Flutter shared adapters now reject incomplete, stale, non-USD,
   non-TCGPlayer, mismatched-scope, or missing-provenance rows.
2. Asking prices no longer carry TCGPlayer proof attributes or semantics.
3. Explore, Compare, and public Wall pricing now require a signed-in viewer
   before governed pricing is fetched.
4. Public GVVI market reference pricing is omitted from anonymous server
   payloads.
5. Search pricing requests are auth-gated and never publicly cached.
6. Vault total and grouped total proof selectors can no longer be confused.
7. Flutter Network uses its ranking RPC only for candidate ordering and
   re-reads every displayed price through `CardSurfacePricingService`.
8. Web and Flutter capture evidence preserves visible text, and the final
   verifier reconciles the visible amount and `From` state.
9. An executable 17-surface registry now binds every surface to its auth
   boundary, reader, renderer, route identity, and capture selector.

## Proof Tooling

The new web collector:

- requires all nine web routes exactly once
- requires a valid signed-in pricing probe
- blocks every non-read HTTP request and records the blocked attempt
- requires exactly one selected visible proof element per route
- captures the proof element and machine-readable dataset
- records visible text
- redacts customer slug and GVVI route identities from permanent JSON

The collector is intentionally not run against production yet. These client
changes are not deployed, so a production capture now would prove the older
client and would be invalid for the final gate.

## Frozen Migration Package

No migration was applied.

The pending package remains exactly:

1. `20260728130000_tcgplayer_market_read_model_contract_completion_v1.sql`
2. `20260728133000_vault_exact_market_pricing_targets_v1.sql`

Their SHA-256 hashes still match the frozen migration manifest. The applied
runtime repair migration `20260729190000` is a prerequisite and must not be
added to the pending package.

## Final Local Verification

- Surface contracts: `18 / 18`
- Full repository contract suite: `886 / 886`
- Full Flutter tests: `312 / 312`
- Full Flutter analysis: passed
- Web typecheck, lint, and production build: passed
- Release secret guard: passed
- Playwright headless Chrome runtime smoke: passed
- Registry/inventory and permanent artifact hash reconciliation: passed

The managed runtime preflight was attempted with the linked local environment,
but the database pooler connection timed out. It performed no write and remains
a mandatory clean-integration-candidate gate after the canary.

## Remaining Release Gates

1. Replacement 72-hour observer passes at or after the required end.
2. Build a clean integration candidate from current `origin/main`.
3. Run the full pre-apply test and migration preflight matrix.
4. Apply and read back exactly the two frozen migrations.
5. Deploy web and Flutter from the exact integration candidate.
6. Capture and reconcile all 17 product surfaces from that same commit.
7. Run full-scope shadow, coverage, performance, provenance, Vault, health,
   and rollback gates.
8. Activate signed-in full publication.
9. Observe seven consecutive unattended production cycles.
10. Produce the final Production V1 report.

The machine-readable sequence is:

`backend/pricing/rollout/tcgplayer_market_post_canary_release_plan_v1.json`
