# Current inventory export V1

Candidate after saved-import parent `19adf542a89238969606dc5d900d7a92ee0b29ed`.
Fresh baseline passes live429/source438 with zero normalized drift. The new
migration adds one authenticated read function; all438 parent migrations remain
unchanged. Implementation and local qualification are in progress.

`vault_inventory_export_v1()` accepts no owner parameter. It derives the actor
from Auth, rejects signed-out calls, and reads only that actor's active physical
copies from `vault_item_instances`. It never reconciles legacy buckets or writes
inventory. Certificate, printing and sealed identities stay distinct. Left joins
retain the owned record if display metadata is unavailable. Section membership
includes only the actor's active sections.

The function is STABLE and read-only. Its count and record reads use the invoking
statement's snapshot, as specified by [PostgreSQL 17](https://www.postgresql.org/docs/17/xfunc-volatility.html).
It returns a scalar JSON object, so an API row cap cannot silently truncate the
copy array. More than20000 copies, a payload above32MiB, or a count mismatch fails
the complete request. There is no partial-download fallback.

The `grookai-inventory-export-v1` document records owner, capture time, scope and
copy count. Each copy includes its explicit owned fields, available catalog,
printing/certificate/sealed identity and sections. Acquisition and asking amounts
and certificate grades are database decimal strings. Unknown currency remains
null. Nested certificate/contents JSON is canonical JSON text to retain unrestricted
numeric precision through JavaScript and Dart. Legacy grade fields remain in the
owned record; they never manufacture a certificate-backed slab.

The export contains current active records, private notes and costs, and photo
references. It does not contain photo files, archived/disposed copies, receipt
history, saved goals, import-review-only rows, or a market valuation. It is not a
supported Grookai restore/import format. JSON preserves the selected field values;
the separately labeled CSV quotes all fields and neutralizes spreadsheet formulas.

Web/native clients must validate owner, schema, completeness, unique copy IDs,
identity anchors and the declared count before enabling save. Account changes,
including A-to-B-to-A, dispose of private state and invalidate in-flight reads.
Use the same loaded snapshot for JSON and CSV; a refresh is explicit. Failed,
unavailable and too-large reads never become an empty-success export.

Qualification requires actual Auth isolation, every identity kind, exact numbers,
empty/over-limit/capped-API coverage, concurrent snapshot behavior, CSV edge cases,
browser downloads and separate Samsung proof. New isolated replay, populated
upgrade, reapply, shadow comparison and ordinary release gates remain required.
No production apply, provider call, deployment or activation is authorized here.
