# Pokemon Classic generated-row journal V2

Status: new isolated executor qualification. No production apply entrypoint.

The V1 journal and its historical receipts remain unchanged. V2 uses its own
job_type and intent version, and reads both V1 and V2 history under the same
execution advisory lock. Any V1 receipt requires its original reconciliation;
it cannot be ignored, relabeled, or adopted by V2. Duplicate cross-version
history also stops execution. This is a fresh policy, not a historical replay.

The original whole102 canonical executor, exact source replay and loopback-only
database guard remain in force. The new atomic receipt binds all102 discovery
and raw IDs (81 retained,21 new), and all102 database-generated mapping IDs to
their exact TCGCSV source products and canonical parents. bigint IDs remain
canonical decimal strings, including values beyond JavaScript's safe integer
range. Unexpected sources, missing/duplicate rows and retained raw-ID changes
are rejected. No TCGCSV provenance is relabeled as TCGplayer.

IDs are captured after the actual insert and before the ledger insert in the
same serializable transaction. Both the returned pending result and durable
payload bind the generated-row fingerprint. Independent READ ONLY recovery
compares those exact IDs in addition to the existing full canonical/printing/
mapping/raw-content checks. A source-equivalent replacement row is a mismatch,
even if its source/product/parent/payload is unchanged. Database sequences remain
database-owned; a failed transaction can leave ordinary sequence gaps.

The caller must persist the pending job ID and generated-row fingerprint before
COMMIT, then compare both with independent readback. A lost acknowledgement never
causes an automatic retry. Fully absent, complete, historical, partial and
inconsistent states remain distinct. The V2 SQL proof actually commits and loses
the response, uses a fresh reader, proves zero-write exact repeat, rejects a V1
ledger and changed raw/mapping IDs, and rolls all corruption probes back.

Qualification clones the selected actual-schema/owner fixture into a NEW local
database and preserves the template. Its write footprint must remain862 inserts
across11 tables with no updates/deletes. Every selected fixture table participates
in preservation snapshots. This closes a generated-ID binding gap, not the
remaining external inbound-FK replay, PostgreSQL17/MAINTAIN, real Auth/application
HTTP, governed image admission, normal source commit/push or production CLI gates.
It grants no family promotion, image pointer, provider-finish or pricing authority.
