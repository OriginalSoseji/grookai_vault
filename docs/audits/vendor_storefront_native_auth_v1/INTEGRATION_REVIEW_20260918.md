# Storefront integration review — September 18, 2026

This is a local review packet. It does not apply either branch, merge PR #473,
push a branch, change a repair database, or authorize release.

Candidate: `feature/vendor-storefronts-v1` in `C:/grookai_vault_storefronts_v1`,
base `a14388f689235d62b3165c1dd88aaa4c562ab186` plus the recorded working diff.
Read `integration-review.json` for the exact read time, source revisions and
three-way merge results.

Current GitHub main was `83b2283a09ad1893e10fcd27d5d8ceb6dbaf4d6d`.
Its 14 changes since the candidate base are catalog audit/index data files.
None overlaps a candidate file. The candidate has not been rebased; those data
changes remain authoritative on main and must not be replaced by older snapshots.

Vault-add [PR #473](https://github.com/OriginalSoseji/grookai_vault/pull/473)
remains open at `6e747bb1561354fc56b62c73be39f258da506f15`. A three-way
`git merge-file` in ignored copies produced these results:

| Overlap | Result and proposed treatment |
|---|---|
| `lib/main.dart` | Combines cleanly. Retain store imports/auth route cases and PR #473's unassigned-add confirmation logic. |
| `docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md` | Conflicting prepended checkpoints. Preserve both the new storefront checkpoints and the Anniversary Vault Add Repair section. |
| `lib/main_shell.dart` | No PR #473 overlap. This follow-up adds a dock height constraint proven by the full-app device test. |

`proposed-pr473-main.patch` and `proposed-pr473-playbook.patch` show the proposed
combination against ignored merge copies. They are review illustrations, not
standalone patches to apply now. The main patch references other PR #473 files;
incorporate the complete reviewed PR, not this single-file extraction. No combined
PR #473 binary/runtime test is claimed. After integration, rerun its unassigned
Vault-add tests alongside the storefront tests. Unassigned copies must still be
excluded from stores until a governed printing is assigned.

The active mapping worktree remains at its recorded checkout and has dirty catalog
presentation, exact-ID search, Trainer Kit, Prize Pack and documentation work.
Its status is captured read-only in the JSON receipt. This candidate did not copy
or edit those files. Store-local filtering remains independent of that search work.
Reconcile AGENTS/operator checkpoints when those changes integrate; retain each
repair checkpoint's source and frozen evidence.

Before any production schema application, the catalog/repair owner must recompute
and review the applicable frozen schema/dependency fingerprints. These migrations
add dependencies involving `auth.users`, `vault_item_instances`, `wall_sections`,
store metadata and private Storage policies. Additive presentation tables can alter
those fingerprints even without changing existing inventory or catalog rows. The
store eligibility functions read the canonical/public-printing boundaries; this
work adds no canonical writer or repair execution authority. The local replay is
proof of local schema compatibility, not a production fingerprint readback.

Suggested review slices:

1. Store schema, capability/publication authority, exact-copy projection and RLS.
2. Custom product/media/versioned quantity boundaries, including `PT409` correction.
3. Web APIs/media/referral ledger and compatibility tests.
4. Native storefront routes/management and the app dock sizing correction.
5. Local evidence and coordinated rollout/rollback instructions.

The source remains uncommitted and reviewable. No messages, review requests or PR
comments were sent to other contributors. Release remains separately authorized:
merge coordination, current production migration preflight, controlled client
release and post-deployment readback. Keep app/web/custom rollout flags off until
that release is approved. Rollback disables the new surfaces and retains store,
product, media, history and Vault data.
