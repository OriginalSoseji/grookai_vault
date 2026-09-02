# Repository Archive Candidate Packet V1

## Decision Boundary

This packet is a read-only planning artifact. It authorizes no branch deletion,
worktree removal, tag mutation, directory cleanup, PR closure, database write,
or Storage write.

**NO DELETION IS AUTHORIZED.**

## Provenance

- Generated: `2026-09-02T14:22:40.785Z`
- Frozen repository SHA: `d2522f77ecd1fb9b8553958dbb094027f467cf18`
- Frozen branch: `docs/repository-archive-candidate-packet-v1`
- Source ledger: `docs/audits/repository_postmerge_disposition_20260902/postmerge_disposition_ledger.jsonl`
- Source ledger SHA-256: `97632b2d608309778c2388867024f7ec80be3e6e07d26b03f910ee284a372d45`
- Source groups reviewed: `466`
- Owner-review candidates: `227`
- Protected exclusions: `239`

## Automation Readback

| Inventory | Status | Findings |
|---|---:|---:|
| Repository active code | available | 82 |
| Windows scheduled tasks | available | 3 |
| Running processes | available | 22 |

Only file names, task identities, process identities, and matched tokens are
retained. Task arguments and process command lines are not persisted.

## Owner-Review Candidates

These sources are clean in the source ledger, contain no migration domain, have
no current open PR, are main-contained or patch-equivalent, and have no detected
active automation reference. They remain proposals only.

| # | Branch | Proposed action shape | Source disposition |
|---:|---|---|---|
| 1 | `agent/binder-descendant-main-guard` | 1 remote | patch_equivalent_to_main |
| 2 | `agent/canary-observation-end-to-end-repair` | 1 local | contained_in_main |
| 3 | `agent/canary-observer-terminal-grace` | 1 worktree, 1 local | contained_in_main |
| 4 | `agent/market-intelligence-count-copy-fix-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 5 | `agent/market-intelligence-selector-order-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 6 | `agent/mtg-catalog-pool-safe-lock-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 7 | `agent/mtg-catalog-supervisor-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 8 | `agent/one-piece-ios-pod-lock-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 9 | `agent/one-piece-signed-in-activation-evidence-v1` | 1 local | contained_in_main |
| 10 | `agent/one-piece-signed-in-release-291-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 11 | `agent/one-piece-signed-in-release-294` | 1 local | patch_equivalent_to_main |
| 12 | `agent/one-piece-signed-in-release-296` | 1 local, 1 remote | patch_equivalent_to_main |
| 13 | `agent/pricing-canary-idempotency-timeout-repair` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 14 | `agent/pricing-canary-missing-source-repair` | 1 worktree, 1 local | contained_in_main |
| 15 | `agent/pricing-canary-repair-v1` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 16 | `agent/pricing-canary-source-gap-observer-v3` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 17 | `agent/pricing-v1-surface-readiness` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 18 | `agent/repair-pricing-canary-ci` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 19 | `agent/repin-pricing-canary-observer-repair2` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 20 | `agent/repin-pricing-canary-observer-shared-rpc` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 21 | `agent/restart-pricing-canary-window` | 1 worktree, 1 local | contained_in_main |
| 22 | `agent/restore-ios-printing-pod-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 23 | `automation/pokemon-master-index-refresh-33061925584` | 1 remote | patch_equivalent_to_main |
| 24 | `automation/pokemon-master-index-refresh-33071559363` | 1 remote | patch_equivalent_to_main |
| 25 | `automation/pokemon-master-index-refresh-33075783669` | 1 remote | patch_equivalent_to_main |
| 26 | `automation/pokemon-master-index-refresh-33185946661` | 1 remote | patch_equivalent_to_main |
| 27 | `automation/pokemon-master-index-refresh-33265698781` | 1 remote | patch_equivalent_to_main |
| 28 | `automation/pokemon-master-index-refresh-33536419403` | 1 remote | patch_equivalent_to_main |
| 29 | `automation/pokemon-master-index-refresh-33606877348` | 1 remote | patch_equivalent_to_main |
| 30 | `baseline/recovered-v1` | 1 local, 1 remote | contained_in_main |
| 31 | `card-detail-hero-redesign` | 1 local | contained_in_main |
| 32 | `card-lightbox-no-scroll` | 1 local | contained_in_main |
| 33 | `catalog/jpn-master-index-v4` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 34 | `catalog/jpn-v4-post-deploy-proof` | 1 local, 1 remote | patch_equivalent_to_main |
| 35 | `checkpoint/collectible-wave1-set-foundations-rollback-v1` | 1 remote | patch_equivalent_to_main |
| 36 | `checkpoint/cross-tcg-set-cover-gap-repair-v1` | 1 local | patch_equivalent_to_main |
| 37 | `child-printing-public-identity-v1` | 1 local, 1 remote | contained_in_main |
| 38 | `chore/audit-staging-green-2025-11-06-main` | 1 local, 1 remote | patch_equivalent_to_main |
| 39 | `chore/mee-nightly-worker` | 1 local | contained_in_main |
| 40 | `chore/nav-friction-pass-1` | 1 local | contained_in_main |
| 41 | `chore/nav-friction-pass-2` | 1 local | contained_in_main |
| 42 | `chore/nav-friction-pass-3` | 1 local | contained_in_main |
| 43 | `chore/nav-friction-pass-4` | 1 local | contained_in_main |
| 44 | `chore/nav-friction-pass-5` | 1 local | contained_in_main |
| 45 | `chore/nav-friction-pass-6` | 1 local | contained_in_main |
| 46 | `ci/prod-probe` | 1 local, 1 remote | patch_equivalent_to_main |
| 47 | `ci/staging-probe-only` | 1 local, 1 remote | patch_equivalent_to_main |
| 48 | `claude/app-visual-pass` | 1 local, 1 remote | contained_in_main |
| 49 | `codex/base-set-lane-representative-images-v1` | 1 local | contained_in_main |
| 50 | `codex/base-set-print-run-lanes-v1` | 1 local | contained_in_main |
| 51 | `codex/beta-readiness-local-community-proof` | 1 local | patch_equivalent_to_main |
| 52 | `codex/binder-daily-backup-contract-v1` | 1 remote | contained_in_main |
| 53 | `codex/binder-guard-powershell-json-date-fix-v1` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 54 | `codex/binder-production-rollout-guard-v1` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 55 | `codex/binder-rollout-activation-fix-20260727` | 1 remote | patch_equivalent_to_main |
| 56 | `codex/card-detail-data-path-perf` | 1 local | patch_equivalent_to_main |
| 57 | `codex/card-detail-initial-render` | 1 local | patch_equivalent_to_main |
| 58 | `codex/card-detail-performance-layout` | 1 local | patch_equivalent_to_main |
| 59 | `codex/card-image-cache-ttl` | 1 local | patch_equivalent_to_main |
| 60 | `codex/card-image-lcp-priority` | 1 local | patch_equivalent_to_main |
| 61 | `codex/card-page-performance-diagnostics` | 1 local | patch_equivalent_to_main |
| 62 | `codex/compact-search-results-layout` | 1 local | patch_equivalent_to_main |
| 63 | `codex/durable-catalog-rate-limits` | 1 local | patch_equivalent_to_main |
| 64 | `codex/fix-card-pricing-bearer-hydration` | 1 local, 1 remote | contained_in_main |
| 65 | `codex/fix-card-pricing-route` | 1 local, 1 remote | patch_equivalent_to_main |
| 66 | `codex/fix-jpn-pikachu-species-search` | 1 local | patch_equivalent_to_main |
| 67 | `codex/global-image-gap-audit-v1` | 1 local, 1 remote | contained_in_main |
| 68 | `codex/grouped-vault-management-hardening-v1` | 1 local | patch_equivalent_to_main |
| 69 | `codex/grouped-vault-section-assignment-v1` | 1 local | patch_equivalent_to_main |
| 70 | `codex/image-surface-consistency-v1` | 1 local | contained_in_main |
| 71 | `codex/immutable-canon-image-route` | 1 local | patch_equivalent_to_main |
| 72 | `codex/ios-beta-1.0.0-2-supabase-rpc-blocker` | 1 local, 1 remote | contained_in_main |
| 73 | `codex/jpn-display-english-primary` | 1 local | patch_equivalent_to_main |
| 74 | `codex/local-community-wishlist-live-smoke` | 1 local | patch_equivalent_to_main |
| 75 | `codex/local-community-wishlist-v2` | 1 local | contained_in_main |
| 76 | `codex/mee-core-normalization-foundation` | 1 worktree, 1 local | patch_equivalent_to_main |
| 77 | `codex/mee-nightly-db-url-query` | 1 local | patch_equivalent_to_main |
| 78 | `codex/mee-nightly-doc-env-fix` | 1 local, 1 remote | patch_equivalent_to_main |
| 79 | `codex/mee-nightly-installer-smoke` | 1 worktree, 1 local | patch_equivalent_to_main |
| 80 | `codex/mee-nightly-local-supabase-cli` | 1 local, 1 remote | patch_equivalent_to_main |
| 81 | `codex/mee-nightly-repo-dir-systemd` | 1 local | patch_equivalent_to_main |
| 82 | `codex/mobile-bulk-copy-management-v1` | 1 local | patch_equivalent_to_main |
| 83 | `codex/mobile-legacy-shared-card-cleanup-v1` | 1 local | patch_equivalent_to_main |
| 84 | `codex/mobile-public-preview-share-v1` | 1 local | patch_equivalent_to_main |
| 85 | `codex/polish-compact-search-cards` | 1 local | patch_equivalent_to_main |
| 86 | `codex/preserve-ios-push-build20-20260707` | 1 remote | patch_equivalent_to_main |
| 87 | `codex/pricing-evidence-engine-contract-v1` | 1 local | patch_equivalent_to_main |
| 88 | `codex/product-evolution-v2` | 1 local, 1 remote | patch_equivalent_to_main |
| 89 | `codex/promote-app-visual-baseline` | 1 local | contained_in_main |
| 90 | `codex/promote-sets-browsing` | 1 worktree, 1 local | patch_equivalent_to_main |
| 91 | `codex/public-card-image-proxy-hotfix` | 1 local, 1 remote | contained_in_main |
| 92 | `codex/public-wall-card-flow-v1` | 1 local | patch_equivalent_to_main |
| 93 | `codex/public-wall-owner-preview-v1` | 1 local | patch_equivalent_to_main |
| 94 | `codex/pulse-wall-vault-product-architecture` | 1 local, 1 remote | contained_in_main |
| 95 | `codex/rank-clean-english-search-results` | 1 local | patch_equivalent_to_main |
| 96 | `codex/rate-limit-source-header` | 1 local | patch_equivalent_to_main |
| 97 | `codex/release-readiness-image-fixes` | 1 local, 1 remote | contained_in_main |
| 98 | `codex/search-skip-pricing-enrichment` | 1 local | patch_equivalent_to_main |
| 99 | `codex/seo-card-sitemap-schema` | 1 local | patch_equivalent_to_main |
| 100 | `codex/seo-internal-id-linking` | 1 local | patch_equivalent_to_main |
| 101 | `codex/system-health-repair-v1` | 1 local, 1 remote | contained_in_main |
| 102 | `codex/vault-management-flow-hardening-v2` | 1 local | patch_equivalent_to_main |
| 103 | `codex/wcd-energy-template-image-policy-v1` | 1 local | contained_in_main |
| 104 | `codex/wcd-final-gap-classification-v1` | 1 local | contained_in_main |
| 105 | `codex/wcd-remaining-gap-classification-v1` | 1 local | contained_in_main |
| 106 | `codex/wcd-representative-image-pointers-v1` | 1 local | contained_in_main |
| 107 | `codex/wcd-residual-image-gap-audit-v1` | 1 local | contained_in_main |
| 108 | `codex/web-bulk-copy-management-v1` | 1 local | patch_equivalent_to_main |
| 109 | `codex/web-copy-section-create-assign-v1` | 1 local | patch_equivalent_to_main |
| 110 | `codex/web-search-performance-language` | 1 local | patch_equivalent_to_main |
| 111 | `codex/web-vault-management-parity-v1` | 1 local | patch_equivalent_to_main |
| 112 | `deploy-printing-vault-display` | 1 worktree, 1 local | contained_in_main |
| 113 | `deploy/card-visual-search-review-portal` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 114 | `docs/app-candidate-309-evidence` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 115 | `docs/catalog-founder-outcome-checkpoint-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 116 | `docs/catalog-trainer-kit-completion-checkpoint-v1` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 117 | `docs/collectible-parser-wave1-checkpoint-v1` | 1 remote | patch_equivalent_to_main |
| 118 | `docs/collectible-wave1-parent-rollback-checkpoint-v1` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 119 | `docs/one-piece-op16-op17-production-closure` | 1 remote | patch_equivalent_to_main |
| 120 | `docs/pokemon-language-master-index-automation-v1` | 1 worktree, 1 local | contained_in_main |
| 121 | `docs/pokemon-master-index-final-readback` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 122 | `docs/release-readiness-testflight-258` | 1 local, 1 remote | contained_in_main |
| 123 | `docs/tk-sm-r-phone-executor-checkpoint-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 124 | `engage/card-journeys` | 1 local | contained_in_main |
| 125 | `engage/collector-memories` | 1 local, 1 remote | contained_in_main |
| 126 | `engage/metrics` | 1 local | contained_in_main |
| 127 | `engage/pulse` | 1 local, 1 remote | contained_in_main |
| 128 | `engage/retention-onboarding` | 1 local | contained_in_main |
| 129 | `engage/want-match` | 1 local | contained_in_main |
| 130 | `feature/catalog-founder-outcome-integration-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 131 | `feature/collectible-wave1-parent-apply-proposal-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 132 | `feature/collectible-wave1-parent-number-repair-v1` | 1 remote | patch_equivalent_to_main |
| 133 | `feature/collectible-wave1-parent-number-repair-v2` | 1 local, 1 remote | patch_equivalent_to_main |
| 134 | `feature/pokemon-catalog-source-admission-repair-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 135 | `feature/search-contract-v1-rpc` | 1 local | contained_in_main |
| 136 | `feature/trainer-kit-gv-namespace-repair-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 137 | `feature/vendor-mode-filters-surface-split-v2` | 1 worktree, 1 local | contained_in_main |
| 138 | `fix/catalog-english-workflow-v1` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 139 | `fix/catalog-miscp-alias-reconciliation-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 140 | `fix/catalog-shadow-empty-queue-issue` | 1 remote | patch_equivalent_to_main |
| 141 | `fix/english-master-index-trainer-kit-authority` | 1 local, 1 remote | patch_equivalent_to_main |
| 142 | `fix/founder-notifications-android-deeplink` | 1 local, 1 remote | patch_equivalent_to_main |
| 143 | `fix/mee-health-bounded-current-run` | 1 local, 1 remote | contained_in_main |
| 144 | `fix/mtg-catalog-supervisor-runner-context` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 145 | `fix/one-piece-legacy-active-verify` | 1 remote | patch_equivalent_to_main |
| 146 | `fix/one-piece-official-numbered-base-name` | 1 remote | patch_equivalent_to_main |
| 147 | `fix/one-piece-set-closure-image-truth` | 1 remote | patch_equivalent_to_main |
| 148 | `fix/pokemon-language-test-isolation-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 149 | `fix/pokemon-master-index-artifact-serialization-v1` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 150 | `fix/pokemon-master-index-printing-continuity-v1` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 151 | `fix/pokemon-master-index-reconciliation-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 152 | `fix/pokemon-master-index-stable-refresh-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 153 | `fix/pricing-canary-observer-main-pin-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 154 | `fix/pricing-health-scaled-read-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 155 | `fix/pricing-ingestion-nightly` | 1 local, 1 remote | contained_in_main |
| 156 | `fix/prod-probe-bootstrap` | 1 local, 1 remote | patch_equivalent_to_main |
| 157 | `fix/prod-probe-new-keys` | 1 local, 1 remote | patch_equivalent_to_main |
| 158 | `fix/production-catalog-crawl-set-headings-20260902` | 1 local, 1 remote | patch_equivalent_to_main |
| 159 | `fix/restore-condition-scan-ui` | 1 local, 1 remote | contained_in_main |
| 160 | `fix/structured-search-evidence-meta-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 161 | `fix/supabase-autoscale-null-preflight` | 1 local | contained_in_main |
| 162 | `fix/supabase-capacity-health-query` | 1 local | contained_in_main |
| 163 | `fix/tcgdex-discovery-fallback-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 164 | `fix/tcgplayer-shadow-runner-temp` | 1 local | contained_in_main |
| 165 | `fix/vault-link-crawl-quantity-removal` | 1 local | contained_in_main |
| 166 | `fix/vendor-nav-drawer-v1` | 1 local | patch_equivalent_to_main |
| 167 | `growth/public-pages` | 1 local | contained_in_main |
| 168 | `hotfix/mobile-authenticated-card-search-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 169 | `hotfix/pokemon-nickname-set-search-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 170 | `hotfix/pokemon-set-alias-search-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 171 | `hotfix/pokemon-set-only-sort-search-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 172 | `identity-engine-finalization` | 1 remote | contained_in_main |
| 173 | `integrate/notifications-messaging-ios-build` | 1 local, 1 remote | contained_in_main |
| 174 | `integrate/recovered-base-plus-mac-app-truth` | 1 local, 1 remote | contained_in_main |
| 175 | `ios-new-dex-vault-build-v1` | 1 local, 1 remote | contained_in_main |
| 176 | `live-card-header` | 1 local | contained_in_main |
| 177 | `live-card-header-fix` | 1 local | contained_in_main |
| 178 | `live-card-identity-fix` | 1 local | contained_in_main |
| 179 | `live-image-ui-fix` | 1 local | contained_in_main |
| 180 | `live-zoom-modal-fix` | 1 local | contained_in_main |
| 181 | `mac/app-truth-e3ec67c` | 1 remote | patch_equivalent_to_main |
| 182 | `merge/full-tcgcsv-warehouse` | 1 worktree, 1 local | contained_in_main |
| 183 | `ops/founder-notifications-production-activation` | 1 local, 1 remote | patch_equivalent_to_main |
| 184 | `ops/pricing-seven-cycle-restart-v1` | 1 local, 1 remote | patch_equivalent_to_main |
| 185 | `ops/pricing-seven-cycle-window-v2` | 1 local, 1 remote | patch_equivalent_to_main |
| 186 | `preserve/scanner-dirty-work-20260503` | 1 local, 1 remote | contained_in_main |
| 187 | `prime/prod-edges-guardrails` | 1 local, 1 remote | patch_equivalent_to_main |
| 188 | `prod-early-access-deploy` | 1 worktree, 1 local | contained_in_main |
| 189 | `reconcile/mac-baseline-plus-pc-migrations` | 1 local | contained_in_main |
| 190 | `refactor/supabase-two-keys` | 1 local, 1 remote | patch_equivalent_to_main |
| 191 | `release/8-week-completion-v1-set-count-parity` | 1 local | patch_equivalent_to_main |
| 192 | `release/app-candidate-310` | 1 local, 1 remote | patch_equivalent_to_main |
| 193 | `release/clean-account-journey-proof` | 1 worktree, 1 local, 1 remote | contained_in_main |
| 194 | `release/gvvi-vendor-qr-v1-linear` | 1 local | contained_in_main |
| 195 | `release/mee-canary-observer-pin-v1` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 196 | `release/pricing-canary-observer-read-model-v1` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 197 | `release/production-v1-audit-remediation` | 1 local, 1 remote | contained_in_main |
| 198 | `release/readiness-audit-20260731` | 1 local, 1 remote | contained_in_main |
| 199 | `release/readiness-audit-v2` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 200 | `release/wall-feed-count-quality` | 1 local, 1 remote | contained_in_main |
| 201 | `release/wall-feed-deploy-config` | 1 local, 1 remote | contained_in_main |
| 202 | `release/xcode-cloud-bootstrap` | 1 local, 1 remote | contained_in_main |
| 203 | `release/xcode-cloud-bootstrap-order` | 1 local, 1 remote | contained_in_main |
| 204 | `release/xcode-cloud-flutter-toolchain` | 1 local, 1 remote | contained_in_main |
| 205 | `release/xcode-cloud-frozen-sdk` | 1 local, 1 remote | contained_in_main |
| 206 | `release/xcode-cloud-mac-handoff-v1` | 1 local, 1 remote | contained_in_main |
| 207 | `release/xcode-cloud-no-codesign` | 1 local, 1 remote | contained_in_main |
| 208 | `release/xcode-cloud-release-config` | 1 local, 1 remote | contained_in_main |
| 209 | `release/xcode-cloud-spm-lock` | 1 local, 1 remote | contained_in_main |
| 210 | `release/xcode-cloud-versioned-sdk` | 1 local, 1 remote | contained_in_main |
| 211 | `scanner-camera-contract` | 1 remote | contained_in_main |
| 212 | `scanner-camera-phase5-3-card-region-normalization` | 1 remote | contained_in_main |
| 213 | `scanner-phase7-db-index` | 1 local, 1 remote | contained_in_main |
| 214 | `scanner-ui-final-zoom-tune` | 1 remote | contained_in_main |
| 215 | `scanner-v4-card-present-gate` | 1 local, 1 remote | contained_in_main |
| 216 | `scanner-v4-foundation` | 1 local, 1 remote | contained_in_main |
| 217 | `scanner/work-v1` | 1 local, 1 remote | contained_in_main |
| 218 | `security/active-runtime-codeql-v2` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 219 | `security/backend-dependencies-v1` | 1 worktree, 1 local | patch_equivalent_to_main |
| 220 | `security/codeql-tooling-readback-v1` | 1 local | patch_equivalent_to_main |
| 221 | `security/codeql-url-authority-v1` | 1 worktree, 1 local | patch_equivalent_to_main |
| 222 | `security/github-actions-permissions-v1` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 223 | `security/runtime-codeql-repair-v1` | 1 worktree, 1 local, 1 remote | patch_equivalent_to_main |
| 224 | `web/mvp` | 1 local, 1 remote | contained_in_main |
| 225 | `wip/custodian-git-cleanup` | 1 local, 1 remote | contained_in_main |
| 226 | `wip/fingerprinting-v1-hash-match` | 1 local | contained_in_main |
| 227 | `work/migrations-recovery` | 1 local | contained_in_main |

Machine-readable detail, including every underlying source row and proposed
action, is in `archive_candidates.jsonl`.

## Protected Exclusions

| Exclusion reason | Branch groups |
|---|---:|
| `detached_source` | 9 |
| `dirty_or_unreadable_worktree` | 11 |
| `migration_bearing_source` | 97 |
| `missing_branch_identity` | 9 |
| `non_archive_ready_disposition` | 220 |
| `open_pull_request` | 2 |
| `protected_branch_or_restore_point` | 3 |
| `protected_provenance_or_historical_evidence` | 13 |
| `repository_automation_reference` | 7 |
| `running_process_reference` | 7 |
| `scheduled_task_reference` | 2 |

Every excluded group and its complete reason set is in
`archive_exclusions.jsonl`.

## Candidate Rules

A branch group can appear as a candidate only when all of these are proven:

1. It has a named, non-protected branch.
2. Every grouped source is `contained_in_main` or `patch_equivalent_to_main`.
3. Every linked worktree was clean and readable in the source ledger.
4. No grouped source contains migration-domain changes.
5. No current open pull request uses the branch.
6. No active repository code, Windows scheduled task, or running process refers
   to the branch or its worktree paths.

Uncertainty always becomes an exclusion, never a candidate.

## Future Destructive Gate

This packet deliberately stops before cleanup. Any later archive execution must
be a separately authorized project that:

1. Freezes exact candidate IDs and hashes.
2. Creates and verifies a fresh off-machine recovery bundle.
3. Rechecks clean state, Git containment, open PRs, scheduled tasks, running
   processes, and repository automation references.
4. Receives explicit owner approval for the exact action plan.
5. Changes only the approved clean worktrees and refs.
6. Verifies restoration from the recovery bundle and confirms no active system
   was affected.
