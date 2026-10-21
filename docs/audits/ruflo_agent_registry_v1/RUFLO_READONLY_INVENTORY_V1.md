# Ruflo Read-Only Inventory V1

- Generated: `2026-10-21T09:03:00-06:00`
- Source commit: `7fc0d4049214a9e88db542b48fafe79438e6bc55`
- Inventory fingerprint: `1a28f52962f2d52e4a19a0e389082d28d837242482462a12a76525f56731e07f`

## Boundary

This inventory is read-only. It authorizes zero agent executions, workflow dispatches, production writes, external actions, branch/worktree cleanup operations, or cross-worktree writes. Every discovered worktree is protected.

## Counts

- Registry agents: 15
- Automation surfaces: 728
- Host lanes: 4
- Discovered worktrees: 36
- Dirty worktrees: 5
- Unreadable worktrees: 0

### Surfaces By Kind

| Value | Count |
|---|---:|
| backend_automation | 615 |
| github_workflow | 66 |
| script_worker | 46 |
| windows_scheduled_task | 1 |

### Surfaces By Domain

| Value | Count |
|---|---:|
| account_deletion | 1 |
| automation | 19 |
| billing | 5 |
| catalog | 86 |
| client | 3 |
| clients | 6 |
| condition | 10 |
| domain | 3 |
| ebay | 3 |
| engagement | 1 |
| governance | 2 |
| grookai_dex | 3 |
| identity | 116 |
| identity_v3 | 20 |
| images | 4 |
| infra | 2 |
| infrastructure | 5 |
| ingestion | 4 |
| lib | 7 |
| maintenance | 17 |
| market_evidence | 4 |
| observability | 3 |
| operations | 17 |
| payments | 5 |
| pokemon | 10 |
| pricing | 277 |
| printing | 12 |
| receipts | 1 |
| release | 3 |
| scanner_v4 | 3 |
| sets | 3 |
| tools | 5 |
| vault | 2 |
| warehouse | 66 |

## Worktrees

| Path | Branch | Dirty | Changes | Policy |
|---|---|---:|---:|---|
| `C:/grookai_cog_tracking_20261016` | `main` | false | 0 | protected |
| `C:/grookai_market_links` | `release/testflight-411-final` | false | 0 | protected |
| `C:/grookai_mee_governance_20261015` | `codex/mee-governance-20261015` | true | 132 | protected |
| `C:/grookai_sales_overhaul` | `fix/vendor-store-search-trigger-main` | false | 0 | protected |
| `C:/grookai_vault` | `feat/app-visual-simplification-v1` | true | 894 | protected |
| `C:/grookai_vault_app_visual_integration` | `feat/app-visual-simplification-v1-main` | false | 0 | protected |
| `C:/grookai_vault_full_route_redesign_20261015` | `feat/web-visual-redesign-v2` | false | 0 | protected |
| `C:/grookai_vault_vault_add_repair_20260916` | `fix/anniversary-vault-add-20260916` | false | 0 | protected |
| `C:/gv_gamestop_zoroark_20261001` | `catalog/gamestop-zoroark-20261001` | false | 0 | protected |
| `C:/gv_jpn_catalog_checkpoint_20261016` | `catalog/jpn-master-index-v5-official-global-catalog` | false | 0 | protected |
| `C:/gv_jungle_edition_20261001` | `fix/jungle-catalog-production-20261004` | false | 0 | protected |
| `C:/gv_mep_catalog_backfill_20261016` | `fix/mep-catalog-backfill-20261016` | false | 0 | protected |
| `C:/gv_mep_catalog_backfill_release_20261016` | detached | false | 0 | protected |
| `C:/gv_mtg_backlog_classifier_20261020` | `codex/mtg-backlog-classifier-20261020` | false | 0 | protected |
| `C:/gv_mtg_catalog_batch_20261020` | `fix/mtg-correction-workflow-binding-v1` | false | 0 | protected |
| `C:/gv_mtg_scryfall_apply_20261020` | detached | false | 0 | protected |
| `C:/gv_mtg_scryfall_backfill_20261020` | `codex/mtg-scryfall-crosswalk-backfill-20261020` | false | 0 | protected |
| `C:/gv_mtg_supervisor_fix_20261020` | `codex/mtg-supervisor-archive-ref-20261020` | false | 0 | protected |
| `C:/gv_ollama_bulk_mapper_20261017` | `codex/ollama-bulk-mapper-20261017` | false | 0 | protected |
| `C:/gv_overhaul_release_20261011` | `release/overhaul-main-20261011` | true | 14 | protected |
| `C:/gv_pricing_completion_agent_20261013` | `feature/pricing-completion-agent-20261013` | true | 82 | protected |
| `C:/gv_pricing_lane_fix_20261017` | `codex/pricing-lane-fix-20261017` | false | 0 | protected |
| `C:/gv_pricing_lane_fix_release_20261017` | detached | false | 0 | protected |
| `C:/gv_pricing_market_history_20261012` | `feature/native-market-history-20261012` | true | 12 | protected |
| `C:/gv_pricing_review_lead_release_20261016` | detached | false | 0 | protected |
| `C:/gv_receipt_delivery_20261005` | `feature/receipt-delivery-20261005` | false | 0 | protected |
| `C:/gv_ruflo_all_agents_plan_20261016` | `docs/ruflo-all-agents-integration-plan-20261016` | false | 0 | protected |
| `C:/gv_ruflo_readonly_adapter_20261017` | `feat/ruflo-readonly-operations-adapter-v1` | false | 0 | protected |
| `C:/gv_ruflo_registry_foundation_20261016` | `feat/ruflo-agent-registry-v1` | false | 0 | protected |
| `C:/gv_ruflo_universal_catalog_shadow_pilot_20261019` | `feat/ruflo-universal-catalog-shadow-pilot-v1` | false | 0 | protected |
| `C:/gv_tcgplayer_backlog_queue_20261021` | `codex/tcgplayer-backlog-queue-20261021` | false | 0 | protected |
| `C:/gv_tcgplayer_mass_cleanup_20261017` | `fix/tcgplayer-mass-cleanup-20261017` | false | 0 | protected |
| `C:/gv_tcgplayer_mass_cleanup_release_20261017` | detached | false | 0 | protected |
| `C:/gv_tcgplayer_scope_repair_20261021` | `codex/tcgplayer-scope-repair-20261021` | false | 0 | protected |
| `C:/gv_universal_catalog_optional_bulbapedia_fix_20261020` | `fix/universal-catalog-optional-bulbapedia-v1` | false | 0 | protected |
| `C:/gv_universal_catalog_secondary_evidence_v2_20261021` | `fix/universal-catalog-secondary-evidence-v2` | false | 0 | protected |

## Runtime Qualification

Configured host lanes are classified from checked-in source and contracts. This inventory does not assert that a Windows task, systemd timer, GitHub schedule, or production runtime is currently installed, enabled, healthy, or authorized. Those facts require direct readback from the owning system.
