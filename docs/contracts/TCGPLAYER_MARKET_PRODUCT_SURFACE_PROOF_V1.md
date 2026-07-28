# TCGPlayer Market Product Surface Proof V1

**Status: ACTIVE**

## Purpose

Repository wiring and component tests do not prove that a deployed,
authenticated client rendered the same price as the governed production read
model. This contract defines the evidence required to close that boundary.

The proof is:

```text
deployed client commit
-> authenticated rendered value
-> machine-readable render evidence
-> screenshot
-> authenticated production read-model row
-> exact amount, scope, timestamp, and provenance reconciliation
```

## Required Surfaces

Every surface is required exactly once:

### Web

- `web_card_detail`
- `web_search`
- `web_explore`
- `web_set_grid`
- `web_compare`
- `web_private_vault`
- `web_public_vault`
- `web_vault_item`
- `web_market_history`

### Flutter

- `flutter_card_detail`
- `flutter_search_or_grid`
- `flutter_set_grid`
- `flutter_compare`
- `flutter_private_vault`
- `flutter_public_collector`
- `flutter_network`
- `flutter_vault_item`

## Proof Kinds

### `price_record`

Used when the rendered value represents one parent summary or one exact
printing. The capture must reconcile:

- card-print identity
- exact printing identity when scope is `card_printing`
- pricing scope
- TCGPlayer Market amount
- USD currency
- source label
- observation timestamp
- publication timestamp
- provenance ID
- `From` state

### `vault_group_total`

Used when a client renders the sum of exact raw-copy prices for one grouped
card. It must reconcile to the sampled card group produced by the exact-Vault
production readback:

- card-print identity
- priced and unpriced raw-copy counts
- exact-copy sum
- latest observation timestamp
- latest publication timestamp

### `vault_total`

Used for the complete authenticated Vault total. It must reconcile to the
exact-Vault production readback:

- priced and unpriced raw-copy counts
- complete exact-copy sum
- TCGPlayer Market label
- USD currency

Parent minimums, slabs, unresolved printings, asking prices, and supporting
metrics cannot enter Vault totals.

## Capture Integrity

Every capture must include:

- exact deployed 40-character commit SHA
- production environment
- authenticated lane
- route or Flutter screen identity
- capture timestamp
- screenshot
- machine-readable render evidence
- SHA-256 hashes for both artifacts

Surface identity is fail-closed. A valid price captured from one route cannot
be relabeled as proof for another required surface.

Web route requirements:

| Surface | Required route identity |
| --- | --- |
| `web_card_detail` | `/card/<gv-id>` |
| `web_search` | `/explore` with a nonempty `q` search parameter after the `/search` redirect |
| `web_explore` | `/explore` without a `q` search parameter |
| `web_set_grid` | `/sets/<set-code>` |
| `web_compare` | `/compare` |
| `web_private_vault` | `/vault` |
| `web_public_vault` | `/u/<collector-slug>` |
| `web_vault_item` | `/vault/card/<id>` or `/vault/gvvi/<gvvi-id>` |
| `web_market_history` | `/card/<gv-id>/market` |

Flutter capture commands must use these exact screen identities:

| Surface | `--route` |
| --- | --- |
| `flutter_card_detail` | `card_detail` |
| `flutter_search_or_grid` | `search_or_grid` |
| `flutter_set_grid` | `set_grid` |
| `flutter_compare` | `compare` |
| `flutter_private_vault` | `private_vault` |
| `flutter_public_collector` | `public_collector` |
| `flutter_network` | `network` |
| `flutter_vault_item` | `vault_item` |

Web pricing components expose `data-pricing-*` evidence attributes. Flutter
pricing components expose a semantics identifier beginning with
`tcgplayer-market-v1` or `tcgplayer-market-vault-total-v1`.

Visible text alone is insufficient. A screenshot without machine-readable
identity and provenance evidence cannot pass.

## Verification

The verifier:

- requires a clean producing commit for `--require-pass`
- runs the production RPC in a read-only transaction under the
  `authenticated` database role
- copies and hashes capture evidence
- reconciles every required surface exactly once
- fails on missing, duplicate, unsupported, stale, mismatched, or ambiguous
  evidence
- writes no database or customer state
- omits customer identifiers from its report

The exact command is documented in
`docs/runbooks/TCGPLAYER_MARKET_PRICING_PRODUCT_V1.md`.

## Completion Boundary

This contract may be marked passed only after the final post-canary clients
are deployed from the exact rollout commit. Local widget tests and captures
from an older deployed client are useful diagnostics but do not satisfy the
production source-to-render gate.
