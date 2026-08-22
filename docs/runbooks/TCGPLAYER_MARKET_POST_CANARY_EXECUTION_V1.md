# TCGPlayer Market Post-Canary Execution V1

## Purpose

This commandbook governs the transition from the active 100-row database-only
canary to signed-in Production V1. It does not authorize anonymous pricing,
Grookai Value, inferred prices, special variants, Japanese cards, slabs,
sealed products, or other TCGs.

The active canary must remain unchanged through:

- production commit `456306bdb2a335286d513c1d612a97a58a1f01cc`
- activation `2026-07-30T18:17:48.625Z`
- required end `2026-08-02T18:17:48.625Z`
- publication run `421f40ab-2d2d-4411-a1b3-7420603c5b86`
- active publication set `5b016262-764b-4b05-9e1e-df15971d0a7d`
- rollback set `1317e10a-c88f-4316-b062-bc5d62e297c9`

Any replacement activation restarts the 72-hour clock.

## Immutable Boundaries

Until Gate 1 passes:

- do not apply production migrations;
- do not activate another publication set;
- do not deploy pricing clients;
- do not alter timer, observer, retry, or scope policy;
- do not repair the two out-of-scope canary rows in place;
- do not run exact-mapping apply;
- do not broaden publication.

Anonymous pricing remains denied after signed-in rollout.

## Gate 1: Complete The Active 72-Hour Canary

At or after `2026-08-02T18:17:48.625Z`, run the existing canary observer from
the frozen production checkout:

```powershell
npm run pricing:market:canary:observe -- `
  --window-start=2026-07-30T18:17:48.625Z `
  --activation-run-id=421f40ab-2d2d-4411-a1b3-7420603c5b86 `
  --required-hours=72 `
  --expected-count=100 `
  --expected-commit-sha=456306bdb2a335286d513c1d612a97a58a1f01cc `
  --require-pass
```

Required evidence:

- observer status `passed`;
- the exact activation, commit, and publication set above;
- no stale or failed effective source cycle;
- publication count reconciles to 100;
- no unexplained run, retry, snapshot, or health mismatch.

Stop if any requirement fails. Preserve the observer artifacts and classify
the failure before making a repair.

## Gate 2: Freeze The Integration Candidate

Create a new clean candidate from current `main`. Do not merge the pricing
branch wholesale. The readiness inventory found 11 content conflicts and
must be used as the integration checklist.

```powershell
git fetch origin
git switch --create pricing/production-v1-integration origin/main
git status --short
npm run pricing:market:post-canary:inventory -- `
  --main-ref=origin/main `
  --pricing-ref=origin/pricing/mee-productization-v1
```

Integrate only reviewed Production V1 runtime, migration, client, test, and
governing files. Resolve each conflict by ownership and current behavior.
Record the resulting candidate SHA before any database action.

Required checks:

```powershell
node --test tests/contracts/tcgplayer_market_*.test.mjs
npm --prefix apps/web run typecheck
git diff --check
git status --short
```

The tracked worktree must be clean. Preserve the exact test output and SHA.

## Gate 3: Strict Migration Preflight And Apply

The only authorized package is:

| Migration | SHA-256 |
| --- | --- |
| `20260728130000_tcgplayer_market_read_model_contract_completion_v1.sql` | `028c94a4b86cf2e29fcd74dba4e5111c24ce70512019db3688c6d1e5b1632681` |
| `20260728133000_vault_exact_market_pricing_targets_v1.sql` | `a66c7ae4aa3903077ad70d81bd1aeaa595f90a27ad30dd5b5604198eb7975cd7` |
| `20260730180000_tcgplayer_market_parent_summary_runtime_repair_v1.sql` | `2cca3f5634a40ee68489944fc08e026f8de840a276f159e43546cd3458ea31cf` |

The original two-migration manifest is immutable historical evidence. Build a
new post-canary manifest that includes all three files. Do not edit migration
history, rename an applied migration, use `--include-all`, or repair history
to force a pass.

Before apply:

1. Confirm the three local hashes.
2. Read production migration history.
3. Prove none of the three versions is already present with different SQL.
4. Confirm the remote project identity.
5. Run the repository migration/RLS smoke tests.
6. Obtain explicit release signoff for the frozen SHA and manifest.

Apply exactly the three migrations through the repository's strict migration
runner. Stop immediately on the first failure.

Post-apply readback must prove:

- all three versions are recorded;
- seven governed functions remain `security definer` with
  `search_path=public`;
- `anon` has no governed pricing execution or parent-view access;
- `authenticated` has only the intended RPC access;
- `service_role` retains internal read access;
- `vault_item_instances` RLS is enabled;
- the vault target view has `security_barrier=true`;
- authenticated owner isolation holds;
- parent summary and exact-vault smoke reads return governed evidence.

No client deployment may start until this readback passes.

## Gate 4: Fresh V1.2 Shadow And Scope Correction

The July 30 read-only audit found two rows in the active 100-row canary that
are outside Production V1.2 scope:

- Bagon, TCGPlayer product `83694`, `EX Trainer Kit 1: Latias & Latios`
- Electrike, TCGPlayer product `85131`, `EX Trainer Kit 1: Latias & Latios`

Both are `deck_exclusive_special_variant`. Do not mutate the active canary.
The first fresh post-canary shadow must deterministically exclude them.

Run a fresh full-scope dry-run/shadow from the integrated SHA, then:

```powershell
npm run pricing:market:coverage -- --require-pass
npm run pricing:market:performance
npm run pricing:market:provenance
npm run pricing:market:vault:verify
```

Required:

- coverage at least 95%;
- zero current or proposed publication rows outside V1.2;
- zero unclassified gaps;
- zero canonical or finish ambiguity admitted;
- exact-printing and language boundaries hold;
- shared read-model and vault evidence reconcile;
- no anonymous visibility.

The July 30 baseline was 31,123 of 32,676 rows, or 95.247%. Its 1,553 gaps
are not release blockers when deterministically classified. The 251
read-only exact-mapping candidates are a separate governed improvement batch,
not a prerequisite to preserve the 95% threshold.

## Gate 5: Deploy And Verify 17 Product Surfaces

Deploy the exact frozen integration SHA to the signed-in web and Flutter
canary environments. Generate the surface manifest:

```powershell
npm run pricing:market:surfaces:manifest
```

Capture and verify all 17 surfaces:

1. web card detail
2. web search
3. web explore
4. web set grid
5. web compare
6. web private vault
7. web public vault
8. web vault item
9. web market history
10. Flutter card detail
11. Flutter search or grid
12. Flutter set grid
13. Flutter compare
14. Flutter private vault
15. Flutter public collector
16. Flutter network
17. Flutter vault item

Each proof must bind the rendered amount to the same governed RPC evidence,
canonical card or printing identity, currency, source, freshness, publication
set, and deployed SHA.

```powershell
npm run pricing:market:surfaces:verify -- `
  --capture-manifest=<capture_manifest.json> `
  --vault-readback=<vault_readback.json> `
  --expected-commit-sha=<frozen_sha> `
  --deployed-commit-sha=<frozen_sha> `
  --require-pass
```

One working page cannot substitute for another surface. A source-level proof
cannot substitute for a rendered capture.

## Gate 6: Signed-In Full Publication

Only after Gates 1-5 pass:

1. Freeze the final publication plan.
2. Reconcile selected, qualified, quarantined, and published counts.
3. Re-run rollback dry-run against the current and proposed sets.
4. Obtain explicit publication signoff.
5. Activate the signed-in publication atomically.
6. Read back the active pointer, snapshots, governed RPC, API, web, and
   Flutter surfaces.

Anonymous access remains blocked pending licensing and display authority.

## Gate 7: Seven Unattended Cycles

Run the full-rollout observer:

```powershell
npm run pricing:market:full-rollout:observe
npm run pricing:market:completion:require
```

Production V1 is complete only after seven consecutive unattended cycles
reconcile without manual repair. Every cycle must preserve exact printing,
freshness, coverage, scope, publication, RPC, and surface evidence.

## Rollback

Before activation, preserve a successful rollback dry-run. If the signed-in
publication violates scope, evidence, count, latency, or client contracts,
execute the repository rollback worker with explicit current and restore set
IDs. Never infer either ID.

The July 30 rehearsal proved:

- current set `5b016262-764b-4b05-9e1e-df15971d0a7d`: 100 rows;
- restore set `1317e10a-c88f-4316-b062-bc5d62e297c9`: 100 rows;
- dry-run writes: zero.

After rollback, verify the active pointer, all governed reads, and all client
surfaces before declaring recovery.

## Stop Conditions

Stop immediately for:

- canary observer failure;
- migration hash or history mismatch;
- unreviewed integration conflict;
- current or proposed out-of-scope row;
- coverage below 95%;
- unclassified gap;
- exact-printing, language, or identity ambiguity;
- security/RLS/grant regression;
- surface evidence mismatch;
- reconciliation mismatch;
- unexpected database write;
- anonymous pricing visibility;
- deployed SHA mismatch.

Preserve the failure evidence. Do not patch and rerun inside the same release
attempt without a new frozen SHA and explicit decision.
