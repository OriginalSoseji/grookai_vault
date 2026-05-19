# CHILD_PRINTING_PUBLIC_PRESENTATION_V1 Audit

Date: 2026-05-18
Status: contract drafted - no implementation

## Scope

This audit captures the presentation decision point after child printing ownership and vault finish display were deployed.

Audited surfaces:

- `/sets/[setCode]`
- `/card/[gv_id]`
- `/dex/[speciesSlug]`
- `/vault`
- exact copy routes

No DB writes, migrations, scanner changes, pricing changes, public route enablement, or Species Dex denominator changes were performed.

## Current Evidence

Implemented baseline:

- `card_printings.printing_gv_id` exists for approved child printings.
- `vault_item_instances.card_printing_id` supports finish-specific ownership.
- Add-to-vault can carry selected `card_printing_id`.
- Vault grouped and exact-copy read models resolve child finish labels.
- Legacy/null rows render `Finish not selected`.
- Parent card routes remain canonical.
- Public child route resolution remains disabled by contract.

Recent local verification from the prior deployment lane:

- web typecheck passed
- web lint passed with the existing WarehouseSubmissionForm image warning
- web build passed
- contracts test passed
- contracts runtime health passed
- `git diff --check` passed

Live deploy evidence from the prior deployment lane:

- production `/sets/sv8pt5` returned 200 and exposed finish option labels
- `/card/GV-PK-PRE-002-MB` returned the safe not-found card surface
- DB/read-model smoke rows showed expected copy labels:
  - `NM • Finish not selected • Raw`
  - `NM • Poké Ball • Raw`
  - `NM • Master Ball • Raw`

## Browser Smoke Limitation

Authenticated browser smoke is still blocked in this Codex session because no callable Chrome or browser automation runtime was exposed after tool discovery.

Impact:

- I could not visually click through the logged-in production UI in the user's Chrome session.
- The smoke evidence available here is deployment status, public HTTP checks, and DB/read-model verification.

Required manual or future automated smoke:

- log in on production
- confirm vault tile copy label for Master Ball
- confirm vault tile copy label for Poké Ball
- confirm exact copy page Finish field
- confirm legacy/null rows say `Finish not selected`
- confirm `/card/<printing_gv_id>` still does not resolve

## Contract Created

Companion contract:

```text
docs/contracts/CHILD_PRINTING_PUBLIC_PRESENTATION_V1.md
```

Key decisions:

- Keep `/card/<parent_gv_id>` canonical.
- Keep `/gvvi/<gv_vi_id>` canonical for owned copies.
- Keep `/card/<printing_gv_id>` disabled.
- Allow finish labels on public catalog surfaces.
- Allow `printing_gv_id` only as optional secondary metadata after UX review.
- Never show raw `card_printing_id` UUIDs as collector-facing identity.
- Do not expose private ownership state publicly.

## Risk Assessment

High:

- Turning on `/card/<printing_gv_id>` without canonical metadata and privacy rules could split SEO/card identity and confuse parent-vs-child ownership.

Medium:

- Showing `printing_gv_id` too prominently could make collectors think it replaces `card_prints.gv_id` or `gv_vi_id`.
- Query context still uses internal `card_printing_id`; this is acceptable for authenticated form flow but should not become public display text.

Low:

- Showing finish labels in Vault is already aligned with current ownership semantics.
- Species Dex denominator remains protected as parent-print based.

## Recommended Next Lane

```text
PUBLIC_PRESENTATION_SMOKE_V1
```

Scope:

- authenticated production browser smoke
- no code unless a visible UI bug is found
- verify exact copy pages and vault tiles with real logged-in session
- record screenshots or DOM evidence

After smoke passes, decide whether to:

- keep `printing_gv_id` hidden behind finish labels
- expose it as secondary metadata on exact-copy pages
- design a future child route contract

## Explicit Confirmations

- No DB writes.
- No migration created or applied.
- No parent `gv_id` changes.
- No Species Dex denominator changes.
- No scanner changes.
- No pricing changes.
- No public child route enablement.
