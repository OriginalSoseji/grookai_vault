# Saved collection import history

The web and native history readers reuse `vault_collection_import_documents_v2`
and `vault_collection_import_groups_v2`. These are private source and historical
reconciliation records, not current inventory. Their existing owner-only RLS and
privileged writer remain the authority. This change adds no migration or writer.

The verified import result links to its saved source. Web list/detail routes live
under `/vault/import/history`; native uses the existing Saved imports entry and a
direct Review saved import action. Uncertain attempts keep the original CSV,
request UUID and targets. History navigation must not release an uncertain attempt
or silently retry a downloaded subset as the original source.

Readers bind every document/group to the authenticated owner and source hash.
They read ascending cursors until an empty page, even when a page is shorter than
requested. Explicit ascending order is required on both SDKs. Failed, repeated,
out-of-order, unrelated or malformed pages fail the complete detail read. Duplicate
source indices/copy IDs, mismatched quantities/targets, unsupported object kinds,
missing fields and impossible addition counts cannot yield partial success.

Previously reconciled rows refer to immutable mappings. A mapped copy may since
have been sold, archived or edited. Historical added/reused counts must not become
current owned counts or valuation. Card and sealed mappings remain distinct.
Unsupported source grades and other fields remain original source evidence, not
raw-card downgrades, verified certificates or invented inventory.

The `grookai-saved-import-v1` JSON download includes every stored parsed source
field and row, mappings and unresolved indices, independently of UI search,
filters and pagination. It preserves source field values, including whitespace,
quotes, newlines, unknown populated columns and source cost/currency labels.
It does not recreate the original CSV byte stream, assert a current inventory
snapshot, or constitute a destination marketplace listing. Keep using the
unchanged original CSV for matching and uncertain-attempt recovery.

Private import/history content closes on owner replacement or sign-out. Late
responses after disposal, replacement or a superseding load cannot restore data.
The browser server-authenticates routes and applies the shared owner boundary;
native routes subscribe to auth changes and clear their source state. RLS and
server owner checks remain independent of these presentation controls.

Qualification requires shared web/native malformed-evidence cases, actual SDK
pagination and lifecycle tests, synthetic Auth/RLS, the existing atomic import and
retry path, actual browser downloads and a separate physical Samsung proof.
Physical iOS and full current-collection export remain separate work.
