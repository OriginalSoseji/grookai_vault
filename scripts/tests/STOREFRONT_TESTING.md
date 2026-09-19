# Storefront candidate test entry points

The release candidate uses one consolidated migration, `20260919050000`, and a
395-file chain. Its local proof project is `grookai-storefront-release-20260919`
on 168xx ports. Do not reset the retained 164xx proof database.

For a source-only check (no database):

```powershell
node scripts/schema/build_storefront_release_v1.mjs
node --test scripts/tests/vendor_storefront_runtime_v1.test.mjs scripts/tests/storefront_preflight_comparison_v1.test.mjs scripts/tests/storefront_release_gate_v1.test.mjs
```

After starting only the existing release database and fixed relay, run the current
rollback-only integration entry point:

```powershell
docker start grookai-storefront-release-relay-20260919 supabase_db_grookai-storefront-release-20260919
node scripts/tests/storefront_release_integration_v1.mjs
docker stop supabase_db_grookai-storefront-release-20260919 grookai-storefront-release-relay-20260919
```

It checks the recorded configuration, empty synthetic target, internal network,
disabled workers, full source hashes, successful replay/tool bindings, and exact
395-row ledger before testing. All fixtures roll back. It accepts no target, SQL,
reset or production arguments. A changed migration or preflight tool requires fresh
formal proof; this runner cannot substitute for migration replay.

The following retained harnesses belong to historical proofs: `vendor_storefront_local_v1`,
`vendor_custom_collectibles_local_v1`, `storefront_supabase_replay_v1`,
`storefront_supabase_live_v1`, `storefront_supabase_catalog_v1`,
`storefront_vault_add_integration_v1`, and `storefront_desktop_fixture_v1`.
They intentionally bind old synthetic environments and the original 396/397-file
package. Use their preserved predecessor worktrees for historical reproduction;
do not change their migration counts or point them at the consolidated database.
The current runner above replaces the old Vault-add SQL command for this candidate.

Desktop browser/build and physical native receipts remain in their audit folders.
The release packaging change leaves product source unchanged. Rerun those journeys
when application behavior changes, using their governed local environment setup.

For the full repository gate, start only the existing dedicated release services:

```powershell
docker start supabase_db_grookai-storefront-release-20260919 grookai-storefront-release-relay-20260919 supabase_rest_grookai-storefront-release-20260919 supabase_kong_grookai-storefront-release-20260919 supabase_auth_grookai-storefront-release-20260919 supabase_storage_grookai-storefront-release-20260919 supabase_inbucket_grookai-storefront-release-20260919
supabase status --workdir .local/integration/release-replay --output json | Set-Content -Encoding utf8 .local/integration/shipcheck-supabase-private.json
node scripts/tests/run_storefront_shipcheck_v1.mjs
docker stop supabase_storage_grookai-storefront-release-20260919 supabase_auth_grookai-storefront-release-20260919 supabase_inbucket_grookai-storefront-release-20260919 supabase_rest_grookai-storefront-release-20260919 supabase_kong_grookai-storefront-release-20260919 supabase_db_grookai-storefront-release-20260919 grookai-storefront-release-relay-20260919
```

Wait for database/API readiness before running the gate. The private status file
contains local keys; keep it ignored and never copy it into receipts. The runner
validates the fixed project and API/DB endpoints, then temporarily binds port 15439
to the dedicated API at 16821. The website build needs that API for sitemap reads.
It invokes the unchanged `npm run shipcheck`, passing only local test settings,
a read-only database connection and the outbound Node network guard. Production
credentials are not inherited. A sparse checkout
must contain the tracked checkpoint, workflow and audit fixtures used by contracts;
restore missing files from its recorded main commit without changing their contents.
The normal pre-commit hook still runs the full suite; this runner does not bypass it.
