# Navigation Friction Pass 2

Status: implemented
Branch: chore/nav-friction-pass-2
Base: main @ 26240a8c

## Objective

Apply one consistent navigation/friction rule to low-risk reversible removals:

> Soft, reversible actions should not block the user with a confirmation dialog. They should complete visually, then offer a short Undo snackbar. Hard-to-reverse actions or actions affecting public/shared trust keep confirmation.

This pass covers exactly two soft-action surfaces and explicitly leaves exact-copy archive unchanged.

## Scope

### 1. Vault Item Delete

File: `lib/main_vault.dart`

Current behavior:

- `_confirmDelete(row)` always shows an `AlertDialog` with `Delete item?`.
- If confirmed, it calls `_delete(row)`, which uses `VaultCardService.archiveAllVaultItems(...)`.
- `_confirmDelete` is reached from list swipe/delete, grid tile menu, recent strip, and by-set previews through shared `onDelete` wiring.

Approved target behavior:

- For low-risk rows, delete immediately and show a 5-second snackbar with `Undo`.
- Keep the confirmation dialog when the row is not low risk.

Low-risk rule:

- `ownedCount == 1`
- not graded/slabbed
- not on Wall or assigned to public sections
- has enough row data to restore via `VaultCardService.addOrIncrementVaultItem(...)`

Rows outside that rule keep the existing dialog.

Undo behavior:

1. Archive/delete using the existing `_delete(row)` path.
2. Reload the vault.
3. Show snackbar: `Removed <card>.` with `Undo`.
4. If Undo is tapped within 5 seconds, call `VaultCardService.addOrIncrementVaultItem(...)` with:
   - same `card_id`
   - `deltaQty: 1`
   - prior `condition_label`
   - fallback name/set/image from the deleted row
5. Reload again.

This restore path intentionally does not try to preserve exact-copy metadata for rows excluded by the low-risk rule. Graded, public, multi-copy, or wall/section rows keep the dialog and current archive behavior.

### 2. Collector Memory Archive

File: `lib/screens/vault/vault_gvvi_screen.dart`

Current behavior:

- `_archiveMemory(memory)` shows an `AlertDialog` with `Archive memory?`.
- On confirmation, it calls `CollectorMemoryService.archive(...)`.
- `CollectorMemoryService.archive(...)` removes the photo object first when `photoPath` is present, then calls `collector_memory_archive_v1`.

Important contract constraint:

- There is currently no `collector_memory_unarchive_v1` RPC.
- `collector_memory_update_v1` only updates active rows and cannot restore an archived memory.
- The service is intentionally RPC-only; existing tests assert it does not write `collector_memories` directly.
- Therefore, a true "server archive immediately, then unarchive on Undo" implementation is not possible without schema/RPC work, which this pass explicitly excludes.

No-schema implementation plan:

1. Remove the confirmation dialog.
2. On archive tap, immediately remove the memory from the in-memory displayed list and show snackbar: `Memory archived.` with `Undo`.
3. Start a 5-second pending archive timer.
4. If Undo is tapped:
   - cancel the pending archive,
   - restore the memory to the visible list,
   - do not call `collector_memory_archive_v1`,
   - do not remove the photo object.
5. If the snackbar times out without Undo:
   - call `CollectorMemoryService.archive(...)`,
   - reload memories from `collector_memories_for_gvvi_v1`.
6. If the deferred archive fails:
   - reload memories,
   - show a visible error via the existing memory error/status path.

This provides the approved user experience without adding a new RPC. If the desired product behavior is strict immediate server archive followed by server unarchive on Undo, this plan must be amended to include a new owner-only restore RPC and migration; that would no longer be a UI-only/no-RPC pass.

### 3. Exact Copy Archive

File: `lib/screens/vault/vault_gvvi_screen.dart`

Do not change `_removeCopy()`.

The existing exact-copy/slab removal confirmation remains correct because it archives the exact active copy itself and can affect public/trust surfaces.

## Explicit Non-Goals

- No schema changes.
- No RPC changes.
- No direct writes to `collector_memories`.
- No changes to exact-copy archive/remove confirmation.
- No changes to public Wall, Journey, Pulse, Feed, scanner, pricing, identity, or notification behavior.
- No changes to the pass-1 catalog-add flow.

## Implementation Notes

### Vault Delete

Add helper logic in `VaultPageState`:

- `_isLowRiskVaultDelete(row)`
- `_deleteWithUndo(row)`
- `_restoreDeletedVaultRow(row)`

`_confirmDelete(row)` can become the routing point:

- if low risk: call `_deleteWithUndo(row)` and return `false` for `Dismissible` callers so the tile dismissal remains controlled by reload,
- else: keep the current dialog path.

The existing `_delete(row)` remains the archive executor.

### Collector Memory Archive

Add a small pending archive state in `VaultGvviScreen`:

- pending memory id(s) hidden from the rendered list,
- cancelable `Timer` for the 5-second archive window.

Update memory list rendering to filter out pending archive ids.

Dispose any pending timers in `dispose`. If the user navigates away during the
Undo window, commit the already-requested archive best-effort so an accepted
archive action does not silently restore itself.

## Tests And Verification

Required checks:

- `flutter analyze`
- `flutter test`
- `npm run shipcheck`

Targeted tests:

- Source/widget test proving low-risk Vault delete no longer contains the `Delete item?` dialog path as the first step.
- Test/source assertion proving high-risk carve-outs remain documented and exact-copy archive still contains a confirmation dialog.
- Collector Memory service/UI test proving no direct `collector_memories` table writes are introduced and no restore RPC is assumed.

Manual/device evidence:

- Vault low-risk delete shows Undo snackbar and restores with Undo.
- Vault high-risk row still shows confirmation dialog.
- Collector Memory archive removes the row immediately, shows Undo, and restores it when Undo is tapped.
- Collector Memory archive without Undo remains archived after timeout/reload.
- Exact-copy archive dialog remains unchanged.

## Rollback

Rollback is code-only:

- Restore the previous `_confirmDelete(row)` dialog-first path in `lib/main_vault.dart`.
- Restore the previous `_archiveMemory(memory)` dialog-first path in `lib/screens/vault/vault_gvvi_screen.dart`.

No database rollback is needed because this pass adds no schema or RPC changes.
