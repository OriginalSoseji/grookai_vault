# Storefront desktop review and handoff — September 18, 2026

## Review scope and finding

Reviewed the desktop owner route, workspace state, owner upload/delivery endpoint,
existing owner mutation APIs, capability boundaries, navigation integration and
review-package source coverage. The baseline is the desktop candidate recorded by
`../vendor_storefront_desktop_v1/final-source.json`, at main
`a151794a98cc1e47a9a8886e0e643009cea898e5`. This is a focused implementation review,
not an independent security audit or a new review of every historical migration.

**Fixed: shared navigation bypassed unsaved-draft confirmation.** Workspace tab
changes were guarded, but Next client navigation from the shared header could
unmount the editor without invoking `beforeunload`. A fresh browser regression
reproduced zero discard dialogs on the old build. The new `useStoreDraftGuard` hook
captures ordinary same-tab link clicks before Next's navigation handler. Cancel
retains the form and URL. Confirm follows the destination by document navigation
without saving the draft or prompting twice. New-tab previews, modified clicks,
downloads and same-document hash links are unaffected. The existing unload warning
continues to cover document exits.

Browser history traversal within a previously established client-side navigation
history is not intercepted by this hook. This proof covers explicit website links,
workspace controls and document exits; it does not claim universal router blocking
or autosave/recovery after browser termination. No draft data is stored in browser
storage. That narrower boundary avoids changing shared Next history behavior.

The rest of the reviewed desktop boundary continues to use authenticated owner
clients and existing governed mutations. No new schema, grant semantics, inventory
ownership writer, public eligibility rule or native source was introduced by this
review. Main remained at the recorded baseline and PR #473 remained OPEN at
`6e747bb1561354fc56b62c73be39f258da506f15` during read-only checks.

## Validation and retained evidence

- `before.log`: failing navigation regression against the preceding production-mode
  local build, after the first seven desktop groups passed.
- `browser-receipt.json` and `browser.log`: final 12-group desktop journey, including
  cancel/confirm navigation, new-tab preview and confirmation that discard did not
  save the edited title. Other groups retain owner isolation, private media, package
  gates, exact-copy edits, conflicts, zero stock and explicit publication coverage.
- `build.log`: passing Next production build including TypeScript.
- `eslint.log` and `verification.json`: focused lint passed with zero warnings.
- `final-readback.json`: recorded revisions, stopped task services and retained local
  database. Earlier SQL/Auth/Storage/catalog/referral receipts remain historical
  evidence for unchanged code, not newly repeated tests in this review.

The retained synthetic Supabase project alone was restarted without reset/replay;
the browser used loopback-only routing and telemetry remained disabled. Fresh
synthetic accounts/copies were added only there. The task's server and seven local
containers were stopped afterward. Shared services, repair databases, production
data, entitlements and prior audit receipts were untouched.

## Integration handoff

The complete candidate remains in `C:/gv_store_desktop_20260918`. Its updated binary
patch is `.local/integration/reviewed-storefront.patch`, with a hash in
`.local/integration/reviewed-patch.json`. This review's `final-source.json` binds the
current working diff, excluding itself. The earlier desktop manifest and patch are
retained as the pre-review baseline. `PR_BODY.md` is a prepared local review
description, not a posted PR or authorization to publish code.

The next release prerequisites are concrete:

1. Recheck main and #473 at integration time. The candidate already contains #473's
   nullable-printing Vault-add work; if it merges independently, reconcile that
   patch instead of applying its changes twice. Keep current catalog/search work
   and both owner/public printing boundaries intact.
2. Coordinate with active catalog repair before applying schema. Recompute and
   approve applicable schema/dependency fingerprints for the three additive
   storefront migrations `20260918040000`, `20260918070000`, `20260918100000`.
   Their FKs, entitlement triggers and Storage policies affect dependencies even
   though they do not repair or mutate canonical inventory.
3. Through the repository's governed production preflight, verify the exact linked
   project, migration ledger, expected local-only migration IDs, RLS/grant behavior,
   Storage privacy and existing live runtime. No production readback has been
   substituted with this local proof.
4. Release schema and web/native clients with app/web/custom rollout flags off.
   Enable a separately authorized bounded pilot only after readback. Desktop
   authoring uses `store_app`; `store_web` permits public web publication. An upgrade
   must not publish retained stores or listings. Billing remains a separate phase.
5. Verify real release auth destinations, private previews/media, capability
   revocation and legacy `/u`, `/gvvi`, `/q` flows before widening availability.
   Disable rollout and restore previous clients for rollback; retain owner data,
   listing history, private media and Vault ownership.

The user's original scope stops before merge, production migrations, entitlement
activation, worker dispatch, payments or deployment. This handoff makes that later
decision reviewable; no such action was performed or implied by local test success.
