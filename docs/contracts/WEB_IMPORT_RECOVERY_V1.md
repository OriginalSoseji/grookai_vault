# Website CSV import recovery

The website importer uses the existing `admin_import_vault_receipted_v1`
transaction introduced on the 408-migration baseline. It no longer loops through individual
copy creations. No migration, API deployment, provider call or native binary
change is part of this repair.

## Ownership and saved outcome

The server authenticates the current user and compares the attempt owner before
admitting a write. The existing owner-write execution context passes that actor
to the administrative RPC; CSV content cannot choose another owner. Canonical
card UUID/GV-ID identity is verified by the database.

Each import freezes a request UUID and the original desired totals before
dispatch. Preview quantities are deficits, but the transaction recalculates
deficits from current ownership under its owner lock. Exact copies, compatibility
mirrors and the successful receipt commit together. A late failure rolls back
the batch and records a terminal failed receipt.

Retrying a successful request returns the original outcome, even when its copies
were subsequently sold or archived. It must not recreate those copies. Changed
targets with the same request UUID fail as a conflict. Transport errors and
unverifiable replies remain uncertain; only a confirmed persisted failure permits
the user's next explicit retry to start a new UUID. Event/cache failures cannot
turn a verified ownership save into an apparent failure.

## Browser recovery

The signed-in page keys its client component by owner. The original matched rows,
filename and UUID are stored under `vault-import:v1:<ownerId>` in sessionStorage
before saving. While pending, uploading a replacement file is disabled. Reloading
the same tab restores the attempt and exposes Retry import. Success clears it.
Another signed-in account cannot recover or submit the first owner's attempt.

This is same-tab recovery, not cross-device or guaranteed recovery after closing
the tab. Browser storage is required before dispatch. Private CSV fields remain
in that tab's storage until the attempt is cleared. Cached older clients retain
flat result count fields and thrown failures; they do not gain durable browser
recovery without loading the new UI.

Validation bounds each attempt to 5,000 rows, 512 KiB of serialized rows and
50,000 desired copies, with validated identity, condition, cost, date and notes.
Unmatched and ambiguous rows remain excluded and reported for manual review.

## Preview accuracy

Sets and candidate prints are cursor-paginated through an empty page, including
when the server applies a smaller row cap. Stored and CSV collector numbers use
the same normalization, so `00065` can match `065/165`. Ownership subtraction
uses the reconciliation key and only a uniquely identified printing. Ambiguous
variants/languages remain visible for review. Fully owned rows display an
explanation rather than an unexplained empty import preview.

## Qualification

Run the three focused contract suites:

```powershell
node --test tests/contracts/web_import_recovery_v1.test.mjs tests/contracts/import_vault_items_owner_boundary.test.mjs tests/contracts/import_catalog_matching.test.mjs
```

The opt-in integration test now uses the preserved `grookai-seller-review-20260929`
409 sandbox after integration with current main. Earlier 408 receipts remain
historical evidence. It verifies all 409 migration hashes, ledger, internal network,
loopback gateway and stopped workers before creating fresh synthetic fixtures.
It never resets the lab or applies migrations. It restores the gateway's prior
state and verifies pre-existing inventory/receipt rows are unchanged.

```powershell
$env:GV_RUN_WEB_IMPORT_RECOVERY='1'
node --test tests/integration/web_import_recovery_v1.test.mjs
```

The test compiles the actual import page, parser, matcher, server action and
Supabase authentication in a minimal Next shell. Chromium and Windows WebKit
exercise real CSV upload, existing-copy deficits, committed-response loss,
same-tab reload/retry and account switching against the real sandbox database.
Separate cases cover forged owners, atomic multi-card replay, archived copies,
payload conflicts and late canonical mismatch rollback. This does not prove the
full authenticated site shell or physical iOS Safari behavior.

Private evidence and screenshots live outside source under
`C:/grookai_vault_operator_artifacts/web_import_recovery_20260929`.
Local qualification is not release proof. Normal commit/shipcheck, review,
authenticated staging and verified website deployment remain separate.
