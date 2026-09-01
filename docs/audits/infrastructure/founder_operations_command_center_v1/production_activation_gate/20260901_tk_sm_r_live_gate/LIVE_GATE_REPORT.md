# Founder Operations Live Gate: SM Trainer Kit Alolan Raichu

## Status

`REVIEW ITEM PUBLISHED / PHONE DECISION PENDING / AUTOMATION DISABLED`

## Migration And Deployment Proof

- The approved base migration remains byte-identical at SHA-256
  `02072d8460785539a6ceed76eef18e39f2fc4eaa99afb5e5064f4b2e24f90fdb`.
- Production ledger readback contains `20260830233000`, `20260831054500`,
  and the additive RPC fix `20260901030000`.
- The live publication exposed an unqualified `digest` call under the hardened
  function search path. Additive migration `20260901030000` changed only the
  service RPC to use `extensions.digest`; it did not edit the approved base
  migration or mutate product data.
- Production web deployment `6193633764` completed successfully from merge SHA
  `b734bf925bf219c3138b08e1970ec2d747d313e0`.
- `/founder/operations` returns HTTP 200 through the expected authenticated
  login redirect.
- `notification-dispatcher` version 16 and `operations-webhook-v1` version 4
  are active. Both reject unauthenticated probes with HTTP 401.

## Legitimate Candidate Proof

- Set: `SM Trainer Kit (Alolan Raichu)` (`tk-sm-r`).
- Existing canonical parent count: `19`.
- Source-proven full set count: `30`.
- Proposed missing count: `11`.
- The English Master Index replay contains all coordinates `1/30` through
  `30/30`, all `master_verified`, using a commit-pinned TCGdex repository
  snapshot and scoped Bulbapedia half-deck evidence.
- Replay totals: `30` card rows, `99` evidence rows, zero conflicts, zero
  manual-review rows, and zero database writes.

## Publication And Boundary Proof

- Work item ID: `8fd61c41-d4d2-484a-a312-4891826d529e`.
- Work item state: `ready_for_review`.
- Plan fingerprint:
  `55da1ae9e45adbc85c2e1b58ca0fad242209352d8d6f2ddba537b55b2d2d6ed7`.
- `command_policy.execution_enabled=false`.
- Readback after publication: zero founder decisions and zero operations
  commands.
- No canonical, Storage, pricing, Vault, image-pointer, or public-visibility
  write was authorized or performed.
- Instant phone notification `0887fd8d-2071-4c58-b677-7eb66bfccdbb` was sent
  successfully in one attempt.

## Verification

- Authority repair focused contracts: `72/72` passed.
- Founder Operations contracts after RPC repair: `18/18` passed.
- Full repository shipcheck passed twice.
- Runtime preflight had zero critical failures.
- Web typecheck, lint, and strict build passed.
- Flutter analyze passed and all `645` tests passed.

## Remaining Gate

1. Open the delivered notification on a physical phone.
2. Verify the set, count evidence, exclusions, and plan fingerprint.
3. Record one review-only founder decision.
4. Read back exactly one decision and zero commands.
5. Only then set `FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE=true` and prove one
   scheduled artifact/readback cycle.

Scheduled automation remains disabled until steps 1-4 are complete.
