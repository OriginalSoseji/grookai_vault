# Native ownership reads and exact-copy selection

Ownership priming for Messages must be read-only. Use the existing authenticated
`vault_mobile_card_copies_v1` reader, with the canonical parent and a null legacy
anchor predicate. The RPC joins the two predicates with OR; supplying an anchor
could broaden the selection. Do not call reconciling anchor, management-detail,
pricing or private-detail writers merely to establish ownership.

Read raw and slab copies, retaining each instance and its real legacy anchor.
Order by creation time and instance ID; read to an empty page, advancing by the
actual page length so a smaller server limit cannot truncate ownership. Reject
malformed or non-advancing responses and account switches. A failed later page
must not return an apparently complete count. Public ownership rules are unchanged.

Objects uses the existing owner exact-inventory reader. Each physical copy has
its own selection key and visible GVVI. Two copies of one parent remain distinct
in a Lot. Only exact-child pricing may appear; absent slab pricing/finish stays
unknown. Section reads are unnecessary for Objects, and a pricing outage must
not hide its owned copies. Vendor Mode keeps its existing strict defaults and
publication behavior.

Opening Sale from Objects carries the selected inventory row's instance, GVVI,
canonical parent and legacy anchor into the editor, including its existing asking
price and note. It must not re-enter the legacy reconciling private-detail RPC.
The save continues through the existing authenticated exact-instance writer;
passing navigation context grants no additional authority. Returning to Objects
reloads inventory so reopening an editor uses the saved values. Memory and Sale
use the same authenticated client as the originating Objects inventory.

Lots currently produce image exports, not persisted inventory or commerce
records. Acceptance must distinguish exported copy identities/prices from a
database save; exporting a Lot must leave inventory unchanged.

An aggregate Lot market estimate uses only positive, finite market amounts for
every selected item. Asking prices cannot fill a missing market amount for raw
cards, slabs or sealed products. A partial sum is not displayed as a complete
estimate. Known totals are labeled `market estimate` without a strikethrough;
seller asking amounts and the bundle price remain separate. Legacy Lot field
payloads keep their existing shape, but asking-only payloads no longer invent an
aggregate market estimate.

## Evidence

Unit/widget tests cover raw/slab/mixed ownership, duplicate anchors, truncated
server pages, later-page denial, guest access, exact Lot selection and optional
prices. `test/integration/native_owned_copies_sandbox_test.dart` is opt-in and
uses real Dart Supabase/Auth/RLS through a transport that rejects non-loopback
targets and inventory mutations.

Run its guarded fixture runner from the isolated candidate:

```powershell
$env:GV_RUN_NATIVE_OWNED_COPIES='1'
node scripts/tests/native_owned_copies_sandbox_v1.mjs
```

The runner validates the preserved seller-review 409 sandbox, its migration
hashes, ledger, internal network, loopback relay and stopped workers. It creates
fresh synthetic accounts/catalog/copies without resetting existing data. It
compares complete inventory snapshots around the Dart read phase and verifies
older rows unchanged. It restores the relay's previous state. Private credentials
and fixture evidence stay under the operator artifact root.

Passing these checks is not device, persisted Memory/Sale/Lot, export, or native
distribution proof. Direct exact-detail consumers still need separate database
acceptance; this repair removes the reconciling dependency from ownership priming.

`integration_test/native_owned_objects_test.dart` is a separate sandbox-only
device harness for the actual Objects, Memory, Sale and Lot screens. It requires
private `GV_OWNED_FIXTURE` configuration and fixed loopback API 31021. Run in an
isolated package/bundle with uninstall disabled. It saves a private Memory,
changes one selected copy's sale terms, independently reads the saved outcomes,
reopens the editor, checks a slab selection, captures both real Lot PNGs and
checks another account cannot change the copy or read its private Memory. It
does not invoke an OS share destination or initialize the complete app shell.
See the checkpoint for actual device outcomes; source presence is not a pass.

`integration_test/lot_market_estimate_device_test.dart` exercises the real Lot
pricing screen and front/back PNG renderer offline, covering missing, partial
and complete market evidence. It needs no account or backend and never invokes
an external share destination.
