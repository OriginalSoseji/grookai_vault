NETWORK FEED DISCOVERY CRASH AUDIT V1

Purpose

Find and fix the exact crash introduced during Network Feed Discovery V1 without reverting unrelated good work.

Crash Capture
	•	command run: `cd /Users/cesarcabral/grookai_vault && flutter run -d B8D3C72A-14B9-4E7C-A42F-AB0C848E42FD`
	•	exact error: no red Flutter exception was emitted during repro; the app launched into Network and stalled on the loading state after discovery ranking
	•	stack trace owner file: none captured from Flutter because execution hung before an exception surfaced
	•	first user-code frame: isolated via instrumentation to `lib/services/network/network_stream_service.dart`
	•	suspected failing phase (do not fix yet): discovery merge path after ranking and before final merged return

Source Isolation
	•	collector path status: completes (`NETWORK_V1 collector fetched: 17`, `NETWORK_V1 collector ranked: 17`)
	•	dbHighEnd path status: completes (`NETWORK_V1 dbHighEnd fetched: 30`)
	•	dbRandom path status: completes (`NETWORK_V1 dbRandom fetched: 5`)
	•	crash occurs during: synchronous post-ranking merge step inside `_injectDiscoveryRows`
	•	exact first failing row/field if visible: not row-specific; execution never reaches `NETWORK_V1 merged count`

Failing Field Audit
	•	file: `lib/services/network/network_stream_service.dart`
	•	line/region: `_injectDiscoveryRows(...)`
	•	failing field: loop termination assumption around `discoveryQueue` vs `targetDiscoveryCount`
	•	expected type: n/a
	•	actual value shape: collector queue can become empty while discovery queue still contains rows beyond the allowed injected count
	•	why it crashes: the `while` condition stays true as long as `discoveryQueue` is non-empty, but once `insertedDiscovery >= targetDiscoveryCount` no branch removes another row, producing an infinite loop and leaving the feed stuck on loading

Mixed Source UI Safety
	•	collector fields required: `vaultItemId`, `ownerUserId`, and contact context for `ContactOwnerButton`
	•	DB row fallback used: none yet; current `_groupedContactAnchor(...)` can incorrectly synthesize a contact anchor for discovery rows
	•	any remaining risk: discovery rows should bypass contact-owner actions and open the canonical card path only
