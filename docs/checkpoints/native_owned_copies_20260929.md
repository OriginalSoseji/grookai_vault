# Native owned-copy selection — September 29

## Lot market-estimate correction

The downstream export finding is fixed locally. Raw/slab asking amounts no longer
substitute for market evidence, matching the sealed-product rule. Missing,
nonpositive or nonfinite values suppress the aggregate estimate. Complete market
totals are explicitly labeled `market estimate` with no discount strikethrough;
asking amounts, bundle price, copy identities and the existing payload shape stay
independent. The pricing-screen helper text also reflects optional market data.

38 focused tests pass, including raw/slab invalid-price cases, mixed/sealed lots,
exact cents, export labels and narrow-frame layout. Offline native screen/export
acceptance passes on the physical Samsung and dedicated iOS 26.5 simulator for
unknown, partial and complete market data, preserving $18.75/$15 asking amounts
and the $30 bundle while showing $32 market estimate only with $12/$20 evidence.
The first focused run exposed a longer-label overflow and stale expected text;
the label now wraps within its available width and the corrected tests pass.
The first normal release run also identified three expected Lot-front golden
changes: asking-only fixtures now omit the old aggregate value. Their reviewed
onyx, ivory and kraft baselines are updated; the original failure images remain
in private evidence. Product code is unchanged by this baseline correction.

Private receipts: `android-lot-1790717989927-result.json` and
`mac/ios-lot-214106-result.json` in the existing artifact root. The qualified
Android debug APK is retained outside generated build output. The earlier
downstream saved-outcome evidence remains valid for the unchanged ownership,
Memory and Sale code. No backend calls or writes occur in this new export test.

Full required repository inputs are restored; current main still matches the
frozen base `24f06b725a3e4f67f7280f3ab6a1f8a155a96c2a`. This candidate changes nine
product files. Normal release qualification runs through the unmodified pre-commit
shipcheck; consult the private `shipcheck-*/receipt.json` for its recorded outcome.
No merge, production deployment or TestFlight upload is claimed.

## Downstream device acceptance update

The selected-copy Memory, Sale and Lot screen journeys now pass on the physical
Samsung SM-S908U and the dedicated iOS 26.5 simulator. Both use isolated application
IDs and the contained 409 sandbox, not production. The normal Samsung package's
version/install timestamps are unchanged; the user's separate booted iPhone 17
simulator is preserved. These are product-screen harnesses, not full app-shell,
physical-iPhone, OS-share-sheet, photo-upload or native distribution acceptance.

This acceptance found and fixed an Objects → Sale blocker: the default legacy
private-detail RPC attempted an inventory-anchor write and returned RLS 42501.
Objects now passes its already-read exact-copy context and preserves the existing
asking price/note. The existing owner-scoped save writer remains unchanged.
Returning from Sale refreshes Objects before reopening an editor. Memory/Sale
services retain the originating authenticated client.

Verified on both platforms: private Memory persisted against the selected raw
instance; Sale changed only the other selected raw copy, reopened with the saved
price/note, and denied another account's write; slab selection retained its exact
identity; the other account could not read the private Memory. Two copies of one
parent remained distinct through actual front/back PNG export with per-copy
asking amounts and a bundle price. Lots are exports, not saved database lots.
Final SQL comparison preserved all 511 other tracked inventory/anchor/cert/receipt
rows and allowed only the selected instance's sale fields and update timestamp.
Repeated test attempts retain their distinct private Memory notes in the sandbox.

785 standard Flutter tests pass (one separately opt-in sandbox case skipped in
that run), full analysis is clean, three source contracts pass, and diff checking
passes. Prior 207-copy read-only acceptance remains the pagination/RLS evidence.
Earlier device harness failures involved lazy-list scrolling, persistent notices,
native keyboard handling, test-driven export frames and a diagnostic formatter;
they are retained as failed runs, not passing evidence. Disk-full builds are also
retained. Windows generated outputs/Gradle transforms were compressed; only the
old isolated Mac inventory acceptance's regenerable Xcode Build/Index directories
were removed after path/workspace verification. Source, archives and evidence stay.

Private PASS receipts: `android-1790717295118-result.json`,
`mac/ios-212944-result.json`, and
`device-fixture-1790715329505/device-outcomes.json` under the artifact root below.
The paired PNGs are retained there; missing artwork is deliberate synthetic data.

Finding at the prior checkpoint (now corrected above): raw-card Lot exports substituted asking amounts into the
displayed aggregate “value” when market prices are unknown. The existing model
and tests explicitly preserve that fallback; this run verifies export identity
and asking amounts, not market-value correctness. Review the pricing label/data
contract before release. Direct legacy detail consumers outside Objects still
need separate reconciliation acceptance.

Next after the correction: qualify normal release gates
with complete required repository inputs, then prepare native distribution.
Physical iPhone, full app-shell/share/photo cases and the wider audit stay open.
No production mutation, schema change, merge, release or TestFlight upload occurred.

## Previous read-only acceptance

Isolated branch `fix/native-owned-copy-selection-20260929`, based on live/main
`24f06b725a3e4f67f7280f3ab6a1f8a155a96c2a`. Read
`docs/contracts/NATIVE_OWNED_COPY_SELECTION_V1.md`.

Extracted the ownership/Objects portion of the preserved September 27 audit
candidate without its unrelated Vendor publication, account, Binder or slab
schema changes. Added server-cap-safe pagination to the exact-copy reader.
Messages ownership avoids the reconciling writer; Objects selects physical
copies independently. Six product files change; no schema or backend deployment.

Verified: all 784 standard Flutter tests pass (the opt-in sandbox case is skipped
in that run); the actual sandbox case separately passes with 207 owner copies,
206 mixed/raw-parent copies and one slab-only copy, two distinct legacy anchors,
foreign-owner denial and account-switch isolation. Complete read-phase inventory
snapshots are identical; all prior rows are retained. Three source-contract tests
pass and Flutter analysis is clean.

Private evidence: `C:/grookai_vault_operator_artifacts/native_owned_copies_20260929`.
The first focused run's request-count assertion needed the new empty terminal
page. Initial sandbox fixture IDs violated the uppercase GVVI constraint; a
subsequent Windows launcher selected the extensionless Flutter script and did
not run the test. Both attempts and their synthetic records are retained. The
passing runner calls the explicit batch executable and requires both successful
test output and the Dart result receipt. No failure was counted as passing.

At that earlier checkpoint: no production writes, reset, migration, device install, native release or TestFlight
upload. Original dirty audit worktrees and completed import rollout are untouched.
The new checkout omits historical audit/SQL documents to conserve disk; normal
repository-wide release gates must use their complete required inputs, never a
bypass. Candidate remains uncommitted pending release qualification.

That checkpoint's downstream screen/device checks are superseded by the update
above; full audit and physical/provider cases remain open.
