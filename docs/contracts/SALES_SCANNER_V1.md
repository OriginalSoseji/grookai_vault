# Sales Desk keyboard QR scanner V1

Desktop and native Sales Desk accept a paired Bluetooth/USB keyboard scanner.
The owner explicitly starts Scan cards and focuses its dedicated input. Enter
submits one label. No global keystroke interception, BLE permission, camera,
scanner SDK or external QR navigation is involved. Resume scanning restores
focus after the owner edits other fields. Scanning adds a local draft line; it
does not complete payment, reserve inventory or mark a card sold.

Accepted labels are bare GVVIs or HTTPS grookaivault.com/www.grookaivault.com
`/q/{GVVI}` and `/gvvi/{GVVI}` URLs. Query/fragment attribution is ignored.
Catalog IDs, UPCs, foreign URLs, credentials, nonstandard ports, oversized and
malformed payloads are rejected. Shared JSON vectors test web/native parity.

Each read resolves the exact active owned copy through authenticated RLS.
Web requires the expected owner, returns the authenticated owner and uses private
no-store responses. Native checks the account before and after its bounded exact
lookup. Neither implementation loads the whole inventory to resolve a scan.
Saved positive supported USD asking prices populate the deal. Otherwise the
existing explicit price editor is required. No market price or printing is inferred.

Up to 50 pending scans serialize; existing 50-line and exact-copy duplicate
guards still apply. A duplicate scan is a visible no-op. Lookup has a 15-second
timeout. Stop, account/deal changes, pending sale/catalog recovery, dialogs and
unmount prevent stale additions. A disabled interval invalidates earlier reads
even if scanning is enabled again before the response arrives. Retained native
workspace tabs explicitly disable scanner input while Desk is hidden or the camera
flow is open. Returning requires starting input again; it never steals focus.
Checkout/deal switching waits for pending scans.
An error cancels queued work; the owner can scan the remaining labels again.
Draft persistence/recovery and final sale ownership/reservation validation remain
the existing authorities. Held drafts and online reservation timers are unchanged.

No schema, production entitlements, canonical data, provider setup or receipt
delivery activation belongs to this feature. Actual Bluetooth hardware pairing
must be distinguished from automated keyboard simulation in test receipts.
Rollback clients while retaining all draft/receipt data.
