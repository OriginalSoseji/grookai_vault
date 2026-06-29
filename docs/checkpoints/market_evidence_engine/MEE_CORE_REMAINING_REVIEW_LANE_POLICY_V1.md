# MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1

The remaining MEE review lanes are now policy-defined.

Safe internal actions that can be batched later:

- `911` reference metric rows to `defer_more_evidence`
- `4` reference-only rows to `defer_active_market_evidence`
- `18` unknown rows to `block_evidence`

Manual or threshold-required rows:

- `270` raw/slab market candidate rows

This preserves the foundation rule: evidence providers do not create public price truth.
