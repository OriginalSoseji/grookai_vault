# REPO_COMPLEXITY_AND_HIDDEN_AUTHORITY_AUDIT_V1

Date: 2026-04-23  
Status: Audit complete  
Scope: Runtime authority, canon/trust mutation paths, compatibility debris, duplication, AI drift entry points, structural complexity

## Executive Summary

This audit was run against the current contract/runtime hardening layer to answer one question:

Can Grookai still behave incorrectly through hidden write power, duplicated truth logic, or bypassable protection?

The answer is yes.

Stop conditions were triggered during this audit:

- multiple canon write authorities still exist
- legacy maintenance authority still exists outside the runtime executor, even though it is now explicitly contained

The intended authority model is clear:

- canon writes should flow through `backend/lib/contracts/execute_canon_write_v1.ts`
- ownership/trust mutations should enter through `apps/web/src/lib/contracts/execute_owner_write_v1.ts` and prove invariants through `apps/web/src/lib/contracts/owner_write_proofs_v1.ts`

The actual authority model now separates active authority from explicit maintenance authority:

- `10` backend files use `assertExecuteCanonWriteV1`
- `14` web mutation files now enter through `execute_owner_write_v1.ts`
- `9` web files still rely on direct ownership proof guards
- `27` web library files still expose direct mutation primitives
- `76` `backend/identity` maintenance scripts now require explicit maintenance mode, the dedicated entrypoint, and dry-run-default execution
- `13` non-identity canon maintenance scripts now require explicit canon maintenance mode, the dedicated launcher, and dry-run-default execution

The highest-risk problems are:

1. Ownership/trust protection is stronger than before, but it is still less uniform than canon protection.
2. `backend/warehouse/staging_reconciliation_v1.mjs` has been contained, but it remains blocked pending a runtime-safe rewrite.
3. `apps/web/src/lib/vault/resolveActiveVaultAnchor.ts` is still a hidden multi-caller ownership mutation helper.
4. Founder warehouse interpreter persistence now exists only through an explicit mutation helper, not the read path.
5. Identity and canon maintenance scripts are now contained, but their long-term replay governance still needs a durable playbook.

## Total Issues By Severity

| severity | count | notes |
| --- | ---: | --- |
| critical | 0 | No live critical canon bypass remains in the audited runtime surface |
| high | 3 | Can corrupt trust/public surfaces, remain blocked pending refactor, or preserve hidden helper authority |
| medium | 9 | Drift, duplication, or explicit maintenance-lane governance risk |
| low | 3 | Remaining convergence work that is no longer a live bypass |

## Audit Surface And Method

Inputs reviewed:

- [RUNTIME_WRITE_PATH_AUDIT_V1.md](/C:/grookai_vault/docs/contracts/RUNTIME_WRITE_PATH_AUDIT_V1.md)
- [CONTRACT_ENFORCEMENT_MAP_V1.md](/C:/grookai_vault/docs/contracts/CONTRACT_ENFORCEMENT_MAP_V1.md)
- [CONTRACT_INDEX_RECONCILIATION_V1.md](/C:/grookai_vault/docs/contracts/CONTRACT_INDEX_RECONCILIATION_V1.md)
- [runtime_automation_v1.mjs](/C:/grookai_vault/scripts/contracts/runtime_automation_v1.mjs)
- [backend/lib/contracts](/C:/grookai_vault/backend/lib/contracts)
- worker directories under `backend/`
- [ownershipMutationGuards.ts](/C:/grookai_vault/apps/web/src/lib/contracts/ownershipMutationGuards.ts)
- helper and action files under `apps/web/src/lib`

Detection method:

- searched for direct write primitives: `.insert()`, `.update()`, `.delete()`, `.rpc()`
- searched for raw SQL write primitives: `insert into public.`, `update public.`, `delete from public.`
- searched for guarded boundaries:
  - `assertExecuteCanonWriteV1`
  - ownership proof guards in `ownershipMutationGuards.ts`
- inspected highest-risk files directly where write power or authority ambiguity appeared

## Hidden Authority Findings

| id | file / family | current classification | severity | evidence | why it matters |
| --- | --- | --- | --- | --- | --- |
| C1 | [backend/warehouse/staging_reconciliation_v1.mjs](/C:/grookai_vault/backend/warehouse/staging_reconciliation_v1.mjs) | `blocked_pending_refactor` | high | Direct canon write helpers were replaced with runtime-enforcement blockers, apply mode is blocked, and the worker now requires `ENABLE_STAGING_RECONCILIATION_RUNTIME_SAFE=true` even for dry-run entry | All direct canon writes were removed. Execution is disabled until a runtime-safe rewrite can split reconciliation-only writes from already-safe alias execution. |
| C2 | `backend/identity/*apply*.mjs`, `*repair*.mjs`, `*migration*.mjs`, `*replay*.mjs` | `contained_maintenance_authority` | high | `76` identity maintenance scripts now carry the maintenance-only boundary, require explicit mode, require the dedicated entrypoint marker, and default to dry-run | The live bypass was removed, but these scripts still represent a separate explicit maintenance authority outside the runtime executor. |
| C3 | [apps/web/src/lib/warehouse/getFounderWarehouseCandidateById.ts](/C:/grookai_vault/apps/web/src/lib/warehouse/getFounderWarehouseCandidateById.ts) | `resolved_explicit_authority` | medium | All write side effects were removed from the read helper. Founder mutation now lives in [persistFounderWarehouseInterpretation.ts](/C:/grookai_vault/apps/web/src/lib/warehouse/persistFounderWarehouseInterpretation.ts). | All write side effects removed from read helper. Founder mutation moved to explicit function. |
| C4 | Canon authority as a whole | `single_active_authority_with_explicit_maintenance_lanes` | low | Runtime executor remains the sole active canon authority; identity maintenance and canon maintenance scripts now require explicit maintenance boundaries, dedicated launchers, and dry-run-default execution | Active canon authority is singular now. The remaining work is governance clarity for the explicit maintenance lanes, not removing another live runtime bypass. |
| H1 | [apps/web/src/app/api/slabs/upgrade/route.ts](/C:/grookai_vault/apps/web/src/app/api/slabs/upgrade/route.ts) | `owner_boundary_enforced` | medium | Route now enters `executeOwnerWriteV1`, archives the source exact copy inside the shared boundary, and proves the source archive state via `createVaultInstanceArchivedProofV1` | The largest slab trust mutation no longer bypasses authority, but it still relies on compensated non-transactional rollback because create + archive span separate service steps. |
| H2 | [apps/web/src/lib/vault/resolveActiveVaultAnchor.ts](/C:/grookai_vault/apps/web/src/lib/vault/resolveActiveVaultAnchor.ts) | `unclear_authority` | high | Write-capable helper functions `insertActiveVaultAnchor` line `94` and `archiveExtraVaultAnchors` line `75`; called by [addCardToVault.ts](/C:/grookai_vault/apps/web/src/lib/vault/addCardToVault.ts) line `104` and [importVaultItems.ts](/C:/grookai_vault/apps/web/src/lib/import/importVaultItems.ts) line `215` | A multi-caller helper can insert/archive ownership anchors behind the scenes. This is hidden write power and an AI drift entry point. |
| H3 | [toggleSharedCardAction.ts](/C:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardAction.ts), [saveSharedCardWallCategoryAction.ts](/C:/grookai_vault/apps/web/src/lib/sharedCards/saveSharedCardWallCategoryAction.ts), [saveSharedCardPublicNoteAction.ts](/C:/grookai_vault/apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts) | `removed_authority` | medium | All grouped compatibility mutation helpers now fail closed immediately and contain no `.insert()`, `.update()`, `.delete()`, `.rpc()`, or `.upsert()` calls. | Grouped compatibility mutation power has been removed. Backward compatibility remains read-only. |
| H4 | Exact-copy metadata owner-write convergence | `owner_boundary_enforced` | low | `saveVaultItemInstanceConditionAction`, `saveVaultItemInstanceMediaAction`, `saveVaultItemInstanceNotesAction`, `saveVaultItemInstancePricingAction`, `saveVaultItemInstanceImageDisplayModeAction`, and `assignConditionSnapshotAction` now enter `executeOwnerWriteV1` and run exact-copy metadata proofs. | These exact-copy metadata surfaces no longer mutate outside the shared owner boundary. Remaining convergence work is now about older proof-guard lanes, not these metadata writes. |
| H5 | [apps/web/src/lib/network/createCardInteractionAction.ts](/C:/grookai_vault/apps/web/src/lib/network/createCardInteractionAction.ts), [replyToCardInteractionGroupAction.ts](/C:/grookai_vault/apps/web/src/lib/network/replyToCardInteractionGroupAction.ts) | `owner_boundary_enforced` | medium | Both paths now enter `executeOwnerWriteV1` and run interaction existence + signal proofs after write | Trust/feed mutation no longer bypasses a shared authority boundary, but duplicated validation logic still creates drift risk. |
| H6 | `backend/domain`, `backend/ingestion`, `backend/infra`, `backend/pricing` canon replay/backfill/promote scripts | `contained_maintenance_authority` | medium | `13` non-identity canon maintenance scripts now require explicit canon maintenance mode, the dedicated launcher, and dry-run-default execution before any public-table mutation can proceed | These maintenance helpers no longer act as live runtime authority. They remain explicit operator-only mutation lanes that should stay narrow and auditable. |

## Duplicated Logic Findings

| id | duplicated concept | locations | authoritative source today | divergence risk |
| --- | --- | --- | --- | --- |
| M1 | Network interaction validation + signal writes | [createCardInteractionAction.ts](/C:/grookai_vault/apps/web/src/lib/network/createCardInteractionAction.ts), [replyToCardInteractionGroupAction.ts](/C:/grookai_vault/apps/web/src/lib/network/replyToCardInteractionGroupAction.ts) | none clearly centralized | Two similar flows separately validate interaction windows, message rules, and signal insertion. Future edits can drift. |
| M2 | Ownership pre-write checks | multiple exact-copy action files under `apps/web/src/lib/vault`, `apps/web/src/lib/wall`, `apps/web/src/lib/slabs`, `apps/web/src/lib/network` | post-write proofs in [ownershipMutationGuards.ts](/C:/grookai_vault/apps/web/src/lib/contracts/ownershipMutationGuards.ts) | Post-write proof logic is centralized, but pre-write validation is still repeated ad hoc. |
| M3 | Compatibility ownership representation | [resolveActiveVaultAnchor.ts](/C:/grookai_vault/apps/web/src/lib/vault/resolveActiveVaultAnchor.ts), [addCardToVault.ts](/C:/grookai_vault/apps/web/src/lib/vault/addCardToVault.ts), [importVaultItems.ts](/C:/grookai_vault/apps/web/src/lib/import/importVaultItems.ts) | exact-copy ownership surfaces | Compatibility anchor repair exists alongside exact-copy ownership mutation, creating duplicate representations of ownership state. |
| M4 | Canon identity mutation logic | `backend/identity/*apply*.mjs`, `*repair*.mjs`, replay helpers | none centralized enough | The same kinds of identity, mapping, and printing mutations are reimplemented repeatedly across maintenance scripts. |
| M5 | Warehouse interpretation persistence | [getFounderWarehouseCandidateById.ts](/C:/grookai_vault/apps/web/src/lib/warehouse/getFounderWarehouseCandidateById.ts) and warehouse worker flows | should be an explicit write flow | Interpretation persistence exists in a read helper instead of one explicit mutation lane. |

## Compatibility Debris With Power

| file / family | status | severity | notes |
| --- | --- | --- | --- |
| `backend/identity/*apply*.mjs`, `*repair*.mjs`, replay helpers | contained maintenance authority | high | Legacy maintenance lanes still mutate canon, but only behind the explicit maintenance boundary. They are no longer implicit runtime authority. |
| [backend/warehouse/staging_reconciliation_v1.mjs](/C:/grookai_vault/backend/warehouse/staging_reconciliation_v1.mjs) | blocked | high | All direct canon writes were removed. The worker now fails closed until a runtime-safe rewrite exists. |
| Grouped shared-card actions under `apps/web/src/lib/sharedCards` | removed_authority | medium | Product UI had already moved away from grouped curation. The remaining grouped mutation helpers are now hard-blocked and no longer write. |
| `backend/domain/*baseline*.mjs`, `backend/ingestion/*apply*.mjs`, `backend/infra/backfill_print_identity_worker.mjs`, `backend/pricing/*promote*.mjs`, `backend/pricing/justtcg_variant_prices_latest_{refresh,repair}_v1.mjs` | contained maintenance authority | medium | The targeted non-identity canon maintenance scripts now share the explicit canon maintenance boundary, default to dry-run, and require the dedicated launcher. They remain outside the runtime executor by design, not by accident. |
| `apps/web/src/lib/warehouse/getFounderWarehouseCandidateById.ts` | resolved | high | Read helper side effects were removed. Founder write authority is now explicit in `persistFounderWarehouseInterpretation.ts`. |

## Enforcement Consistency Gaps

| surface | current protection | classification | gap |
| --- | --- | --- | --- |
| Canon worker paths using `assertExecuteCanonWriteV1` | full runtime path | fully_protected | Good boundary, but too narrow relative to total canon mutation surface. |
| Ownership/trust actions using `execute_owner_write_v1.ts` + `owner_write_proofs_v1.ts` | shared write boundary + proof helpers | partially_protected | High-priority trust mutations and exact-copy metadata now share one entrypoint, but several older exact-copy and compatibility surfaces still bypass it. |
| `slabs/upgrade` route | owner boundary + compensated rollback | partially_protected | Ownership mutation now enters one boundary, but the route still spans separate create/archive service steps. |
| Network interaction actions | owner boundary + interaction proofs | partially_protected | Trust/feed mutations now share one entrypoint, but validation and signal logic are still duplicated across create/reply flows. |
| Grouped compatibility actions | hard-blocked fail-closed shims | partially_protected | Legacy grouped mutation paths no longer write, but they remain deprecated compatibility entrypoints that should stay blocked or be deleted later. |
| Founder warehouse review helper | pure read + explicit mutation helper | partially_protected | Hidden read-side writes are gone, but the explicit founder mutation helper is not yet routed through broader runtime doctrine. |

Summary:

- canon protection is stronger than ownership/trust protection
- ownership/trust protection is stronger only where proof guards were explicitly added
- several public-trust and compatibility surfaces still bypass both authority layers

## AI Drift Entry Points

These are places where a future AI-assisted change could add or preserve unsafe authority without touching the contracts layer.

| file / family | risk | why it is an AI drift entry point |
| --- | --- | --- |
| [apps/web/src/lib/warehouse/getFounderWarehouseCandidateById.ts](/C:/grookai_vault/apps/web/src/lib/warehouse/getFounderWarehouseCandidateById.ts) | medium | The read helper is now pure, but founder interpretation persistence still sits outside the runtime layer in a separate explicit mutation file. |
| [apps/web/src/lib/vault/resolveActiveVaultAnchor.ts](/C:/grookai_vault/apps/web/src/lib/vault/resolveActiveVaultAnchor.ts) | high | Utility/helper naming hides real mutation power and multi-caller reach. |
| `backend/identity/*apply*.mjs`, `*repair*.mjs`, replay helpers | medium | They now require explicit maintenance mode, but they remain large scripts that can drift independently of the runtime executor. |
| Grouped shared-card compatibility actions | low | They are now explicit blocked shims. The remaining risk is accidental reintroduction of write behavior, not live authority. |
| `apps/web/src/lib/network/createCardInteractionAction.ts` and `replyToCardInteractionGroupAction.ts` | medium | Direct trust/feed writes live outside the ownership guard story. |
| Out-of-index contract-like docs listed in [CONTRACT_INDEX_RECONCILIATION_V1.md](/C:/grookai_vault/docs/contracts/CONTRACT_INDEX_RECONCILIATION_V1.md) | medium | Repo authority language remains broader than runtime authority, which invites drift and accidental scope invention. |

## Complexity Smells

Complexity is only called out here where it increases hidden power or drift risk.

| file / family | complexity | reason |
| --- | --- | --- |
| [apps/web/src/lib/warehouse/getFounderWarehouseCandidateById.ts](/C:/grookai_vault/apps/web/src/lib/warehouse/getFounderWarehouseCandidateById.ts) | moderate | Read aggregation and interpretation remain, but persistence side effects were removed into an explicit mutation file. |
| [backend/warehouse/staging_reconciliation_v1.mjs](/C:/grookai_vault/backend/warehouse/staging_reconciliation_v1.mjs) | moderate | Write behavior was removed, but the file still mixes read-side classification and blocked execution intent mapping. |
| `backend/identity/*apply*.mjs`, `*repair*.mjs`, replay helpers | high | Large transaction scripts coordinate many tables and embed domain-specific rewrite logic repeatedly. |
| [apps/web/src/lib/slabs/createSlabInstance.ts](/C:/grookai_vault/apps/web/src/lib/slabs/createSlabInstance.ts) and [apps/web/src/lib/vault/updateVaultItemQuantity.ts](/C:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts) | high | These exact-copy mutation paths are already sensitive and carry multi-step business logic. |
| [apps/web/src/lib/vault/resolveActiveVaultAnchor.ts](/C:/grookai_vault/apps/web/src/lib/vault/resolveActiveVaultAnchor.ts) | moderate | Hidden mutation helper with repair behavior and caller-dependent semantics. |
| [createCardInteractionAction.ts](/C:/grookai_vault/apps/web/src/lib/network/createCardInteractionAction.ts) and [replyToCardInteractionGroupAction.ts](/C:/grookai_vault/apps/web/src/lib/network/replyToCardInteractionGroupAction.ts) | moderate | Similar trust mutations are split across separate files with overlapping validation and write logic. |

## Authority Graph Summary

### Intended Authority Graph

```text
Canon write caller
  -> declared contract scope
  -> execute_canon_write_v1
  -> validate_write_v1
  -> write
  -> run_post_write_proofs_v1
  -> violation/quarantine on failure

Ownership/trust write caller
  -> owner/trust action
  -> ownershipMutationGuards.ts proof
  -> fail closed on invariant break
```

### Actual Authority Graph

```text
Canon:
  execute_canon_write_v1
  -> guarded worker paths (10 files)

  staging_reconciliation_v1
  -> blocked pending runtime-safe rewrite

  backend/identity apply/repair/replay scripts
  -> explicit maintenance-only canon identity/mapping/printing writes

  backend/domain/ingestion/infra/pricing canon maintenance scripts
  -> explicit maintenance-only canon replay/backfill/promote writes

  getFounderWarehouseCandidateById.ts
  -> pure founder review read path

  persistFounderWarehouseInterpretation.ts
  -> explicit founder-controlled interpreter persistence

Ownership/trust:
  execute_owner_write_v1.ts
  -> slabs/upgrade
  -> addCardToVault
  -> updateVaultItemQuantity
  -> createSlabInstance
  -> createCardInteractionAction
  -> replyToCardInteractionGroupAction
  -> importVaultItems
  -> exact-copy metadata actions
     -> saveVaultItemInstanceConditionAction
     -> saveVaultItemInstanceMediaAction
     -> saveVaultItemInstanceNotesAction
     -> saveVaultItemInstancePricingAction
     -> saveVaultItemInstanceImageDisplayModeAction
     -> assignConditionSnapshotAction

  ownershipMutationGuards.ts / owner_write_proofs_v1.ts
  -> selected exact-copy actions and owner-boundary proofs

  grouped shared-card compatibility actions
  -> blocked compatibility stubs

  resolveActiveVaultAnchor.ts
  -> hidden compatibility ownership writes reused by multiple callers
```

Authority conclusion:

- active canon authority is singular
- canon maintenance lanes are explicit and non-default
- ownership/trust mutations still depend on scattered local discipline

## Risk Inventory

| id | type | severity | finding |
| --- | --- | --- | --- |
| C1 | hidden_authority | high | `staging_reconciliation_v1` is now blocked pending refactor instead of acting as a live canon bypass |
| C2 | compatibility_debris | high | legacy identity/apply/replay scripts are now contained behind an explicit maintenance-only boundary |
| C3 | hidden_authority | medium | founder warehouse read helper was converted to a pure read; explicit founder mutation now lives in `persistFounderWarehouseInterpretation.ts` |
| C4 | inconsistent_enforcement | low | canon now has one active authority; the remaining canon write lanes are explicit maintenance-only boundaries |
| H1 | hidden_authority | medium | slab upgrade route now uses the owner boundary, but it still relies on compensated rollback across separate service steps |
| H2 | hidden_authority | high | `resolveActiveVaultAnchor.ts` is a multi-caller write helper |
| H3 | compatibility_debris | low | grouped shared-card actions are blocked and no longer retain live mutation power |
| H4 | inconsistent_enforcement | low | exact-copy metadata paths now share the owner boundary; remaining convergence work is in older proof-guard exact-copy actions |
| H5 | hidden_authority | medium | network interaction actions now share the owner boundary, but their validation logic is still duplicated |
| H6 | compatibility_debris | medium | non-identity canon replay/backfill/promote scripts now sit behind the explicit canon maintenance boundary |
| M1 | duplication | medium | network interaction logic duplicated across create/reply flows |
| M2 | duplication | medium | ownership pre-write validation is repeated ad hoc |
| M3 | duplication | medium | compatibility anchor logic duplicates ownership representation |
| M4 | AI_drift_risk | medium | out-of-index contract docs and maintenance scripts widen authority ambiguity |
| M5 | complexity_smell | medium | large multi-responsibility files correlate with bypass risk |

## Recommended Next Actions Ranked By Impact

1. **Replace the blocked `backend/warehouse/staging_reconciliation_v1.mjs` with a runtime-safe rewrite.**  
   Direct writes were removed, but the worker still has no safe execution lane for reconciliation-only state changes.

2. **Convert `resolveActiveVaultAnchor.ts` from a hidden utility write helper into an explicit owner-write primitive.**  
   Hidden helper writes are exactly the kind of authority AI changes will miss.

3. **Decide how explicit founder interpreter persistence should be governed.**  
   The hidden read/write leak is fixed, but `persistFounderWarehouseInterpretation.ts` is now an explicit founder mutation path outside the runtime core.

4. **Keep the explicit identity + canon maintenance boundaries narrow and decide the long-term replay architecture.**  
   The live bypass is removed, but the contained maintenance lanes still need a governed long-term home instead of remaining permanent ad hoc operator surfaces.

5. **Converge the remaining older exact-copy proof-guard actions onto `execute_owner_write_v1`.**  
   Start with archive, intent, execution-outcome, and wall-section flows that still rely on mixed guard patterns.

6. **Collapse network interaction creation and reply into one authoritative mutation service.**  
   Shared validation, shared signal behavior, shared proof boundary.

7. **Reconcile contract authority language with runtime authority language.**  
   Anything out of `CONTRACT_INDEX` must stay non-authoritative until it is promoted or archived.

## Final Verdict

Grookai now has a real contract/runtime layer with one active canon authority.

The repo still contains:

- trust mutations outside proof boundaries
- compatibility debris that still requires explicit maintenance governance
- helper-level hidden authority
- duplicated rule systems that can drift independently
- explicit maintenance canon lanes outside runtime

The main repo risk is not generic messiness. It is hidden trust mutation and maintenance drift.

`staging_reconciliation_v1` is still blocked pending rewrite, and the maintenance lanes are now explicit rather than live runtime authority. The system is materially safer, but it still is not in a state where incorrect behavior is impossible to perform without being blocked or detected because ownership/trust helper writes and older proof-guard lanes still remain.
