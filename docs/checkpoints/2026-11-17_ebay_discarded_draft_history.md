# eBay discarded draft history — 2026-11-17

## State

The eBay seller workspace keeps active and in-progress listings in the primary
“Recent listings” list. Discarded (`abandoned`) drafts appear inside a collapsed
“Discarded drafts” section with a count. Expanding the section preserves access
to each discarded draft.

This is a presentation change only. It does not delete, modify, or hide records
from the seller workspace data. The native seller screen already omits
abandoned drafts from its recent list; this brings the web workspace in line.

## Production evidence

The authenticated production browser reached `/vault/ebay` and showed a linked
seller account and a discarded-draft history. The connected session did not
need another OAuth consent. The Samsung device was not available for direct
screen verification.

## Source and verification

- Branch: `fix/ebay-discarded-draft-history`, based on `origin/main` at
  `8b70faff21`.
- Source: `apps/web/src/components/ebay/SellerWorkspace.tsx` and
  `apps/web/src/components/ebay/SellerWorkspace.module.css`.
- Regression coverage: `apps/web/tests/parity/ebay-seller-workspace.spec.ts`.
- Targeted Playwright test passed; full eBay workspace spec passed (17 tests).
- Repository checks passed in the isolated worktree: contracts (8,730 tests),
  eBay seller backend (12 tests), Square (120 tests), vendor pricing (19 tests),
  runtime health, quarantine and deferred reports, web typecheck, web ESLint,
  strict production web build, Flutter analyze, and Flutter tests (2,056 passed,
  2 skipped). Collector read-only preview mode was limited to the typecheck and
  build processes, and admin DB credentials were removed from those processes.
- The Next.js build emitted existing Supabase dynamic-dependency warnings and
  passed its strict build wrapper. `git diff --check` passed.
- No database migration, production deployment, listing edit, or listing
  publication was performed.

## Next

Publish this focused web change through the normal current-main release path.
Review the collapsed history in the authenticated seller workspace after the
preview or release is available.
