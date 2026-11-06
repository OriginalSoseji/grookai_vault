# TCGPlayer reviewed-invalidation qualification repair V1

Date: 2026-11-06  
Repair commit: `801e77af1b8ea1fcd36f2b9dd5226ce151f9662e`  
Worker: `TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_22`  
Policy: `TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3`

## Outcome

The no-write production-data qualification passed. The policy now quarantines a
source mapping only when its reviewed invalidation reason is exactly
`PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT`. Unrelated review metadata remains
non-blocking.

All seven Professor Program products remain fresh, exact-finish, eligible
`publish` decisions. The two invalid Gengar observations are now ineligible
`quarantine` decisions. Reconciliation reported no mismatches.

No publication tables, canonical identities, Vault data, current-publication
pointer, or production prices were written.

## Root cause

Production run `e097ae97-745c-42a0-a97b-7d9d14f3a020` selected 211,664
observations and qualified 177,111, but activation failed closed with:

`published readback mismatch expected=177111 current=177109 matching=177109`

The two-row difference was TCGPlayer product `684431`, Gengar from ME03 Perfect
Order: Holofoil `$0.87` and Reverse Holofoil `$0.67`. Source mapping `131943`
had already been reviewed invalid with reason
`PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT`. The public read model correctly
rejected the mapping, while the qualification policy had not yet consumed that
reviewed invalidation.

The failed publication set `d5d3f19d-9058-4a26-a7b8-1e18f5721bc4` remained
staging. The live pointer remained on the prior Nov 5 publication set
`fc972c2d-47fd-48c6-8b0e-324376024801` from run
`50b3beda-bc35-4d68-84bb-37aea7e092df`.

## Commit-bound qualification

Run key:
`TCGPLAYER-REVIEWED-INVALIDATION-QUALIFICATION-REPAIR-COMMIT-V1`

Source sync run: `c583e2a1-4b07-4be5-b9a9-fd7cd34e5922`

| Result | Count |
| --- | ---: |
| Selected | 211,664 |
| Eligible | 177,105 |
| Quarantined | 20,219 |
| Excluded | 14,340 |
| Delayed | 0 |
| Suppressed | 0 |
| `reviewed_source_mapping_invalidated` | 2 |
| Reconciliation mismatches | 0 |

Artifact SHA-256 values:

| Artifact | SHA-256 |
| --- | --- |
| Run plan | `325dcebdab3425b93d4a2cb80c7be47fdc8363cf168499f7259b6206b4f30153` |
| Summary | `94ddd6695b4e8f8be5b962fa505c04fe6a4013154fb29eaa652c5c34def3d33e` |
| Decisions | `2dd3dd51332472bd4818fbac0cecc0c171da34a6fbf5b6685f25e3278d223562` |
| Reconciliation | `25d73214d886a8fc09deb997847b6283888c1cf1b1fd9930d2b2dabd74b9823b` |

The full decisions artifact is approximately 805 MB and remains ignored local
evidence. `target_decisions.json` is the compact review projection for the nine
decisions relevant to this repair.

## Professor Program readiness

| TCGPlayer product | Finish | Market | Mapping | Decision |
| ---: | --- | ---: | ---: | --- |
| 176629 | Normal | $134.99 | 355730 | publish |
| 176630 | Holofoil | $54.95 | 355731 | publish |
| 176631 | Normal | $50.99 | 355732 | publish |
| 176632 | Reverse Holofoil | $22.88 | 355733 | publish |
| 176633 | Reverse Holofoil | $20.45 | 355734 | publish |
| 213516 | Reverse Holofoil | $22.41 | 355735 | publish |
| 499366 | Reverse Holofoil | $14.19 | 355736 | publish |

These prices are qualified but are not live until a new governed production
publication run creates, verifies, and activates a replacement publication set.

## Verification

- Focused pricing contracts: 54 passed, 0 failed.
- Repository Node contracts: 8,579 passed, 0 failed, 11 skipped.
- Backend seller tests: 12 passed, 0 failed.
- Runtime health, quarantine, and deferred reports: passed; unresolved
  quarantine count 0.
- Web typecheck and lint: passed.
- Strict production web build: passed.
- Flutter analyze: no issues.
- Flutter tests: 1,982 passed, 0 failed, 2 skipped.
- Full commit-bound pricing dry run: passed with zero reconciliation mismatches
  and every write/activation flag false.

## Remaining release boundary

Merge the policy repair, then run a new full governed production publication
from the merged commit. Do not resume or activate the failed staging set because
its qualification provenance predates this repair.
