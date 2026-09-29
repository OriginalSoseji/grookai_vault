# Native search recovery and store access

The founder reported unreliable search and missing Manage store, and explicitly
requested fixes delivered through TestFlight. This branch starts from current
main4ee5fc42e, preserving the released artist, set and finish interpretation.

Read-only live checks also reproduced truncation of ordinary names: Pika and
Charizard returned32 cards without pagination metadata even with pagination=1.
The shared route now recognizes literal full/partial catalog names and sends
them through complete retrieval before pagination. Older native clients receive
the complete result set, while web clients receive stable pages and a total.
The name RPC accepts literal fragments only when every word matches the returned
name, filters unrelated fuzzy candidates and checks all raw RPC pages. Unknown
words and exact identifiers retain their established interpretation. Complete
searches receive a bounded twelve-second resolution budget rather than4.2s.
One- and two-character fragments retain bounded ranked search. Exhaustive name
retrieval requires at least one literal word of three characters, including after
rarity/number removal, so early keystrokes cannot launch full-catalog scans.

Native search invalidates prior responses immediately when text changes, avoids
duplicating an in-flight search on keyboard submit, and clears stale results and
interpretation while a new query loads. Failed searches offer Retry search and
do not claim that the catalog has no matches. Read requests allow twenty seconds
and retry one transient timeout/network/502/503/504 failure with identical query
and authentication. Auth, validation and rate-limit responses are not retried.
No direct database fallback drops the user's constraints.

Signed-in collectors can reach Manage store directly from the main menu and
Account, independently of profile loading. Vendor Mode has a visible labeled
button. Existing store access checks still decide which actions are available;
navigation does not grant entitlements or publish a store.

Tests exercise slow/transient/permanent failures, bounded retries, stale-response
rejection during typing, duplicate submission and manual retry. Existing store
permission/publication tests remain required. Native device/simulator evidence,
normal source checks, signed archive and Apple TestFlight readback are separate
release gates. Do not report delivery before Apple confirms availability.

Private receipts and authoritative progress:
C:/grookai_vault_operator_artifacts/search_store_testflight_20260928/CHECKPOINT.md.
Mac artifacts use the matching directory under ~/grookai_operator_artifacts.
Build329 and prior source/archives remain preserved. No schema, catalog, billing
or production inventory writes are included. The shared resolver correction
requires separately verified staged/live website deployment; TestFlight alone
does not deploy the server correction.
