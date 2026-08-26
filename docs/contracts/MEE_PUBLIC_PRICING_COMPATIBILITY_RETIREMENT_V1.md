# MEE Public Pricing Compatibility Retirement V1

**Status: ACTIVE**

## Decision

Production V1 publishes prices only through the governed TCGPlayer Market read
model, `get_market_pricing_read_model_v1`. MEE evidence, Grookai Value, modeled
values, active eBay asks, and legacy fallback prices cannot become the displayed
Production V1 market close.

The obsolete `public.v_card_pricing_ui_v1` compatibility surface retains its
database column shape but returns zero rows. `anon` and `authenticated` receive
no access. `service_role` retains `SELECT` only for operational readback.

## Invariants

- No canonical identity, Vault, pricing observation, publication, or MEE row is
  inserted, updated, or deleted by this retirement.
- Supported web, Flutter, and edge clients use
  `get_market_pricing_read_model_v1`.
- Exact printing and finish governance remains enforced by the current pricing
  publication and read-model contracts.
- Restoring any modeled or evidence-derived public value requires a post-V1
  contract, migration, and release gate.
