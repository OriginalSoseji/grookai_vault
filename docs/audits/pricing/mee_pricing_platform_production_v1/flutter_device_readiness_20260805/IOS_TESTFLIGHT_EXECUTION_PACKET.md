# iPhone and TestFlight Execution Packet

## Authority Gate

Do not execute this packet until the replacement pricing canary receives a
terminal pass after `2026-08-08T07:51:54.064Z` and final-slot completion grace.
The terminal observer result, integration commit, and migration hashes must be
recorded before any production mutation or distribution upload.

## 1. Freeze the Integration Candidate

1. Start from current production `main` after the terminal observer passes.
2. Integrate the reviewed Flutter pricing commits without unrelated changes.
3. Record the exact candidate SHA and require a clean tracked worktree.
4. Recheck the two frozen migration file hashes against the permanent
   migration manifest.
5. Run syntax checks, all contracts, Flutter analyze/tests, web checks, and the
   release secret-packaging check.

## 2. Apply the Frozen Read Model

1. Run the strict linked migration preflight.
2. Apply exactly:
   - `20260728130000_tcgplayer_market_read_model_contract_completion_v1.sql`
   - `20260728133000_vault_exact_market_pricing_targets_v1.sql`
3. Preserve migration output and schema readback.
4. Verify grants and RLS for signed-in and anonymous roles.
5. Confirm signed-in governed reads work and anonymous pricing remains denied.
6. Verify provenance and rollback from production evidence.

Stop immediately on a migration, schema, grant, RLS, readback, or count
reconciliation mismatch.

## 3. Prove Android Pricing After Migration

Rebuild Android from the exact integration SHA and repeat the eight-surface
matrix. Each applicable surface must prove:

- amount and currency;
- TCGPlayer Market source;
- freshness and source timestamp;
- exact printing and finish;
- `From` behavior only where multiple accepted printings support it;
- expandable provenance or the governed route to it;
- private and public Vault totals where authorized;
- honest unavailable, stale, ambiguous, and source-missing states.

Capture screenshots and machine-readable UI output, then reconcile them with
the governed API response. A screenshot alone is not sufficient.

## 4. Build and Test iPhone

1. Pull the exact approved integration SHA on the trusted Mac.
2. Confirm release configuration contains only public client configuration.
3. Clean and resolve iOS dependencies without changing application code.
4. Build and install on a physical signed-in iPhone.
5. Repeat the eight-surface matrix and negative-state checks.
6. Confirm exact printing identity survives Search, Card Detail, Set, Dex,
   Compare, Vault, public collector, and Vault-item navigation.
7. Capture device logs and verify no startup, image, auth, pricing, or fatal
   rendering failures.

## 5. Archive and Upload

1. Increment the build number without changing the approved application code.
2. Archive from the exact approved integration SHA.
3. Record archive UUIDs, application version/build, commit SHA, and signing
   identity.
4. Upload the archive and dSYMs. Confirm Firebase Crashlytics reports no
   missing dSYM for the uploaded build.
5. Upload to TestFlight but expose it only to the bounded signed-in canary
   group.
6. Record App Store Connect processing and availability evidence.

## 6. TestFlight Canary

Require successful signed-in smoke on at least one iPhone after installation
from TestFlight, not Xcode. Confirm all eight surfaces and negative states.
Monitor crashes, authentication failures, pricing read failures, stale-price
states, wrong-printing reports, and image failures before widening access.

## Stop Conditions

- terminal pricing observer does not pass;
- candidate SHA or migration hash changes unexpectedly;
- migration preflight or apply fails;
- any schema, RLS, grant, provenance, or reconciliation mismatch;
- exact printing is lost on any route;
- a governed price is shown without source/freshness evidence;
- anonymous pricing becomes readable;
- iOS dSYM upload is incomplete;
- the TestFlight build differs from the approved SHA.

Anonymous/public pricing remains a separate licensing and display-authority
gate and is not authorized by this packet.
