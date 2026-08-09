# Clean Account Want Match Preflight Blocker V1

## Result

Status: `blocked`

TestFlight build `286` cannot complete the governed clean-account Want Match journey without manufacturing a prerequisite outside the product. The newly created account has no `collector_local_discovery_settings` row, while the production candidate function requires an enabled viewer setting with compatible country and region context before any source card can become a Want Match candidate.

## Production Readback

- Clean release accounts in the bounded window: `1`.
- Clean account public profile and Vault sharing ready: `true`.
- Clean account local-discovery setting rows: `0`.
- Exact visible sources for `GV-PK-CEC-214`: `0`.
- Exact Want Match candidates for `GV-PK-CEC-214`: `0`.
- Clean account current Want for the target before preflight: `false`.
- Clean account active matches before preflight: `0`.
- PokeJavi eligible trade copies for `GV-PK-CEC-214`: `1`.
- PokeJavi public profile enabled: `true`.
- PokeJavi Vault sharing enabled: `true`.

All database checks ran inside read-only transactions.

## Product Boundary

Repository search found readers for local discovery on mobile and web, but no mobile or web product path that writes `collector_local_discovery_settings`. The web Nearby screen instructs collectors to enable local discovery from account settings, but that setting surface is not implemented in the current client source.

The release journey contract prohibits direct production-table mutation to manufacture any stage of the proof. Creating a local-discovery row manually would therefore invalidate Journey C.

## Decision

- Do not toggle Want in build `286` and wait for a match that the production predicate cannot produce.
- Do not insert or update local-discovery settings through service-role SQL.
- Do not claim Journey C complete.
- Treat the missing collector-controlled local-discovery setup path as a release blocker.

## Required Repair Gate

1. Add a real signed-in account setting for local discovery with explicit collector consent.
2. Persist only coarse supported location context required by the existing governed predicate.
3. Add RLS/RPC and client contract tests proving owner-only writes, disable behavior, and no exact-location leakage.
4. Build a new immutable release candidate.
5. Repeat physical Android and physical iPhone affected journey/state proof against that candidate.
6. Complete the clean-account Want-on, generated match, owner context, card-centered message, Want-off, stale suppression, and read-only reconciliation chain.

## Boundaries Preserved

- No production database writes were made by this preflight.
- No Want was enabled.
- No match, event, notification, or message was manufactured.
- No email, password, token, raw user ID, owner ID, device identifier, or private message is retained.
