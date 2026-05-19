# PRINTING_IDENTITY_UI_V1 Audit

Date: 2026-05-18
Status: Audit complete - contract drafted

## Scope

Audited current app surfaces that present or consume child printing finish data:

- `/sets/[setCode]`
- `/card/[gv_id]`
- `/dex/[speciesSlug]`
- `/vault`
- `/vault/card/[cardId]` and exact copy reads

This audit did not perform DB writes, migrations, scanner changes, pricing changes, or public route enablement.

## Current Surface Findings

### `/sets/[setCode]`

Files:

- `apps/web/src/components/PublicSetCardGrid.tsx`
- `apps/web/src/lib/publicSets.ts`
- `apps/web/src/lib/publicSets.shared.ts`

Status: partially ready.

Current behavior:

- Set tiles render one parent tile per `card_prints.gv_id`.
- Child finish chips are rendered from `card_printings`.
- Chips are interactive buttons with active state.
- Selection updates tile label state.
- Links carry `?printing=<card_printing_id>` to `/card/[gv_id]`.
- Parent set count is not inflated by child printing count.

Gaps:

- `publicSets.ts` does not project child printing image URLs; `image_url` and `display_image_url` are currently set to `undefined` for printings.
- Current code does not expose `printing_gv_id` in set tile data.
- Raw `card_printing_id` is used as route context, which is acceptable internally but not collector-facing identity.

### `/card/[gv_id]`

Files:

- `apps/web/src/app/card/[gv_id]/page.tsx`
- `apps/web/src/lib/getPublicCardByGvId.ts`
- `apps/web/src/components/cards/PrintingSelector.tsx`
- `apps/web/src/components/vault/AddToVaultCardAction.tsx`
- `apps/web/src/lib/vault/addCardToVault.ts`
- `apps/web/src/lib/vault/getOwnedObjectSummaryForCard.ts`

Status: mostly ready for parent-route finish selection.

Current behavior:

- Card detail resolves canonical parent `card_prints.gv_id`.
- Non-parent child public routes are not implemented.
- `PrintingSelector` renders selectable finish chips.
- Add-to-vault action accepts `card_printing_id` from form data.
- Server add-to-vault path verifies selected `card_printing_id` belongs to the parent `card_print_id`.
- Owned raw copy summary reads `card_printing_id` and resolves finish labels for card detail ownership display.

Gaps:

- `getPublicCardByGvId.ts` does not project `printing_gv_id`.
- `PrintingSelector` deduplicates by finish label, which is suitable for simple finish lists but may hide multiple child rows with the same label if the catalog later needs same-label child distinctions.
- Card image selection is parent-display-image first; child image support depends on child image projection, which is not wired in this worktree.

### `/dex/[speciesSlug]`

Files:

- `apps/web/src/app/dex/[speciesSlug]/page.tsx`
- `apps/web/src/lib/grookaiDex/getGrookaiDexSpeciesDetail.ts`
- `apps/web/src/lib/vault/getOwnedPrintingCountsByCardPrintIds.ts`

Status: ready for parent-print Dex completion, partial for finish ownership display.

Current behavior:

- Species Dex completion stays parent-print based.
- Owned/missing tabs are based on parent card prints.
- Owned child finish labels are shown when a signed-in user owns rows with `card_printing_id`.
- Missing links route to parent `/card/[gv_id]`.

Gaps:

- The current page does not expose a full master-set option selector inside Dex.
- Missing child option actions do not route with selected finish context.
- `getGrookaiDexSpeciesDetail.ts` does not project `printing_gv_id`.

### `/vault`

Files:

- `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
- `apps/web/src/components/vault/VaultCardTile.tsx`

Status: not finish-identity complete.

Current behavior:

- Vault grouped view uses `vault_item_instances` as active ownership authority.
- Grouping is parent `card_print_id` based.
- Counts remain compatible with parent ownership.

Gaps:

- `fetchActiveInstances()` does not select `card_printing_id`.
- `CanonicalVaultCollectorCopyItem` does not include `card_printing_id`, finish label, or future `printing_gv_id`.
- Grouped copy lists cannot show finish mix for raw copies.
- A user owning Master Ball and Poké Ball copies of the same parent can see the aggregate count without clear grouped finish labels.

### `/vault/card/[cardId]` and Exact Copy Reads

Files:

- `apps/web/src/app/vault/card/[cardId]/page.tsx`
- `apps/web/src/lib/vault/getVaultInstanceByGvvi.ts`

Status: not finish-identity complete.

Current behavior:

- Vault card management inherits grouped vault read model.
- Exact copy read resolves parent card print and copy metadata.

Gaps:

- `getVaultInstanceByGvvi.ts` does not select `card_printing_id`.
- Exact copy detail cannot display finish label for child-printing ownership.
- No exact-copy read model projects future `printing_gv_id`.

## Contract Decisions

The companion contract is:

```text
docs/contracts/PRINTING_IDENTITY_UI_V1.md
```

Key decisions:

- Parent `card_prints.gv_id` remains the canonical public route identity.
- Child printing identity must remain contextual in V1.
- Public child printing routes remain disabled.
- Species Dex denominator remains parent-print based.
- Vault surfaces are the next required implementation area because they lose finish specificity in grouped and exact-copy reads.

## Recommended Next Implementation Lane

```text
PRINTING_IDENTITY_VAULT_DISPLAY_V1
```

Recommended scope:

- Add `card_printing_id` to grouped vault active instance reads.
- Fetch child finish labels for all owned raw copies.
- Add `finishLabel` and optional internal child identity fields to copy items.
- Render finish labels in `/vault` grouped copy lists.
- Render finish label in exact copy pages.
- Use `Finish not selected` for legacy/null ownership rows.
- Do not change grouping, parent counts, Species Dex denominators, or public routes.

## Risk Summary

High:

- Vault grouped display currently hides child finish specificity, which can make independently owned Master Ball/Poké Ball/Reverse Holo copies look like generic duplicates.

Medium:

- Set/card image switching cannot be fully reliable until child printing image projection exists.
- `PrintingSelector` label-level dedupe may need revision if multiple same-label child rows become legitimate.

Low:

- Parent route and Dex denominator behavior are currently protected by existing parent `gv_id` and parent completion logic.

## Explicit Confirmations

- No DB writes performed.
- No migration created or applied.
- No scanner changes.
- No Species Dex denominator change.
- No pricing changes.
- No public child route enablement.
