# Ruflo Read-Only Inventory V1

- Generated: `2026-10-20T17:19:49.233Z`
- Source commit: `869dbb86dc2952de4a406eaa8b0bf05bf96d3e67`
- Inventory fingerprint: `74d6cb0f9f52c9308040252bb676ab3c70604217e347ac0228ae1941ff439fc4`

## Boundary

This inventory is read-only. It authorizes zero agent executions, workflow dispatches, production writes, external actions, branch/worktree cleanup operations, or cross-worktree writes. Every discovered worktree is protected.

## Counts

- Registry agents: 15
- Automation surfaces: 168
- Host lanes: 4
- Discovered worktrees: 30
- Dirty worktrees: 7
- Unreadable worktrees: 0

### Surfaces By Kind

| Value | Count |
|---|---:|
| backend_automation | 52 |
| github_workflow | 66 |
| script_worker | 46 |
| systemd_timer | 3 |
| windows_scheduled_task | 1 |

### Surfaces By Domain

| Value | Count |
|---|---:|
| automation | 18 |
| billing | 4 |
| catalog | 46 |
| client | 3 |
| condition | 5 |
| ebay | 2 |
| governance | 2 |
| grookai_dex | 2 |
| identity | 3 |
| images | 4 |
| infra | 2 |
| infrastructure | 4 |
| ingestion | 2 |
| market_evidence | 6 |
| observability | 3 |
| operations | 13 |
| payments | 3 |
| pokemon | 6 |
| pricing | 30 |
| release | 1 |
| sets | 2 |
| vault | 1 |
| warehouse | 6 |

## Worktrees

| Path | Branch | Dirty | Changes | Policy |
|---|---|---:|---:|---|
| `C:/grookai_cog_tracking_20261016` | `main` | false | 0 | protected |
| `C:/grookai_market_links` | `release/testflight-411-final` | false | 0 | protected |
| `C:/grookai_mee_governance_20261015` | `codex/mee-governance-20261015` | true | 110 | protected |
| `C:/grookai_sales_overhaul` | `fix/vendor-store-search-trigger-main` | false | 0 | protected |
| `C:/grookai_vault` | `feat/app-visual-simplification-v1` | true | 731 | protected |
| `C:/grookai_vault_app_visual_integration` | `feat/app-visual-simplification-v1-main` | false | 0 | protected |
| `C:/grookai_vault_full_route_redesign_20261015` | `feat/web-visual-redesign-v2` | false | 0 | protected |
| `C:/grookai_vault_vault_add_repair_20260916` | `fix/anniversary-vault-add-20260916` | false | 0 | protected |
| `C:/gv_gamestop_zoroark_20261001` | `catalog/gamestop-zoroark-20261001` | false | 0 | protected |
| `C:/gv_jpn_catalog_checkpoint_20261016` | `catalog/jpn-master-index-v5-official-global-catalog` | false | 0 | protected |
| `C:/gv_jungle_edition_20261001` | `fix/jungle-catalog-production-20261004` | false | 0 | protected |
| `C:/gv_mep_catalog_backfill_20261016` | `fix/mep-catalog-backfill-20261016` | false | 0 | protected |
| `C:/gv_mep_catalog_backfill_release_20261016` | detached | false | 0 | protected |
| `C:/gv_mtg_scryfall_backfill_20261020` | `codex/mtg-scryfall-crosswalk-backfill-20261020` | true | 5 | protected |
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
| `C:/gv_ruflo_universal_catalog_shadow_pilot_20261019` | `feat/ruflo-universal-catalog-shadow-pilot-v1` | true | 1 | protected |
| `C:/gv_tcgplayer_mass_cleanup_20261017` | `fix/tcgplayer-mass-cleanup-20261017` | false | 0 | protected |
| `C:/gv_tcgplayer_mass_cleanup_release_20261017` | detached | false | 0 | protected |
| `C:/gv_universal_catalog_optional_bulbapedia_fix_20261020` | `fix/universal-catalog-optional-bulbapedia-v1` | false | 0 | protected |

## Runtime Qualification

Configured host lanes are classified from checked-in source and contracts. This inventory does not assert that a Windows task, systemd timer, GitHub schedule, or production runtime is currently installed, enabled, healthy, or authorized. Those facts require direct readback from the owning system.
