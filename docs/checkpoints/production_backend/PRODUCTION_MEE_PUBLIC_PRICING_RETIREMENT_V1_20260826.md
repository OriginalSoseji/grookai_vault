# Production MEE Public Pricing Retirement V1

**Checkpoint date:** `2026-08-26`

**Producer commit:** `55991a7f5c853599bdfc4ebcd801b8304039e203`

**Migration:** `20260826053000_retire_mee_public_pricing_compatibility_v1`

**Migration SHA-256:** `4cf137744186f3100a5afb08743d2100eaafbb63d7f9e35effcd103f77e144a9`

## Context

Production V1 freezes the displayed market close to exact, fresh TCGPlayer
`marketPrice` evidence. Current web, Flutter, and edge clients use
`get_market_pricing_read_model_v1`, but the historical authenticated
`v_card_pricing_ui_v1` compatibility view still referenced the internal MEE
Grookai Value bridge.

## Risk

Leaving the obsolete view authenticated created a second pricing authority. A
future client regression could consume an evidence-derived modeled value even
though the frozen Production V1 contract forbids it.

## Decision

Retain the legacy view's 19-column database shape, make it return zero rows,
deny `anon` and `authenticated`, and keep `service_role SELECT` only for
operational readback. Do not map the view to parent or sibling TCGPlayer prices,
because that would bypass exact-printing governance.

## Alternatives Rejected

- Mapping the view to MEE or Grookai Value: violates Production V1 authority.
- Mapping it to a parent-level TCGPlayer fallback: could misprice an exact
  printing or finish.
- Dropping the view: creates unnecessary dependency risk.
- Reapplying or rewriting pricing publication rows: outside this repair.

## Migration Applied

The guarded writer performed a production rollback-only transaction first,
then applied the identical migration hash atomically with one migration-ledger
row. Protected canonical, printing, Vault, publication, and MEE row counts were
identical before and after.

- Dry-run fingerprint:
  `4fd14009643a3968b5f43f00185bdd52c7622b98dfa17ba6bddad322c57d4b50`
- Apply fingerprint:
  `868dfe4151b11ddded3b0efd869afbbbf419c7425d105828627b5b91438ab49d`
- Ledger head after apply: `20260826053000`

## Current Truths

- `v_card_pricing_ui_v1` exists and returns `0` rows.
- Its definition references no MEE, eBay-active-price, or governed publication
  relation.
- `anon SELECT = false`.
- `authenticated SELECT = false`.
- `service_role SELECT = true` for readback.
- Authenticated and service-role execution of
  `get_market_pricing_read_model_v1(uuid[], uuid[])` remains enabled.
- Anonymous execution of the governed market RPC remains denied.
- The post-retirement MEE fast readback has zero findings and zero public,
  app-visible, market-truth, direct-publication, or publication-gate rows.
- The remaining-candidate action gate is a no-op with zero eligible rows.

## Verification

- Focused retirement/bridge/freeze tests: `25 / 25` passed.
- Full contract suite: `2,442 / 2,442` passed.
- Full managed pre-commit shipcheck: passed.
- Independent production SQL readback: passed.
- Remote immutable pricing release worktree: clean after preserving generated
  readback artifacts externally.

Permanent evidence:

- `C:\secure-ops\production-backend-launch\mee-compat-retirement\dry-run\`
- `C:\secure-ops\production-backend-launch\mee-compat-retirement\apply\`

Key artifact SHA-256 values:

- Dry-run report:
  `03a6b711f6fed6fb28ebdeb2885489af34c16f6da0f6a38555500c3628180b10`
- Apply report:
  `532048ee9101fb21c9d33d85e8a0625325e3c769c27ff56877749d90bf2e4a49`
- Independent readback:
  `72c866335551e1dc728363952b5431a2fd51603f281868bf8cf420c66681eec4`
- Fast MEE readback:
  `7ae252d2c4fdd0698b1c2a7680379bb332484a991ce4b96c3213fc917026ca04`
- Remaining-action readback:
  `4b4e295b3e250d63793bc4d85663964411461745457f496cab92b2d4e149ea1a`

## Invariants

- MEE remains derived internal intelligence and never becomes the Production
  V1 displayed market close.
- Only exact, qualified, fresh TCGPlayer `marketPrice` can publish through the
  governed read model.
- No canonical, Vault, pricing publication, or MEE evidence row may be changed
  by compatibility retirement.
- Anonymous pricing remains separately governed.

## What Must Never Be Broken

- Exact-printing and finish boundaries.
- TCGPlayer market-close provenance.
- Service-only MEE evidence and review tables.
- App-role denial on obsolete pricing interfaces.
- Atomic migration ledger order and rollback proof.

## Explicit Next Gate

Allow the already-running governed TCGPlayer recovery cycle to reach terminal
state without launching another cycle. Then execute pricing health, coverage,
performance, provenance, Vault, product-surface, canary/full-rollout, and
completion readbacks. A synchronized web, Android, and iOS deployment remains
a later same-candidate gate.
