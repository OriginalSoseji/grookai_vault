# Background catalog supervision V1

Japanese Pokémon, One Piece and cross-TCG sealed catalogs receive six-hour
read-only audits of their existing durable catalog. Funko is excluded: its
production foundation is not implemented. This contract grants no ingestion,
canonical repair, pricing, visibility, image, ownership or notification authority.

The monitored scope is `durable_catalog_integrity_and_coverage`. Japanese scope
is the union of Japanese parent-domain rows and active Japanese identity rows.
Duplicate shells are excluded only when their preserved redirect names a different
parent with the matching GVID and an active Japanese identity. An invalid redirect
remains in scope and its missing identity remains a finding. Japanese set integrity
uses the actual set ID and code; governed product sets can belong to the shared
Pokémon game. One Piece scope is its game ID, with `one_piece_eng_print` identities.
Both report sets, parents, active identity and
set integrity, mapping providers, exact-printing coverage and image gaps.
Sealed scope reports families, variants, candidate classification/review backlog,
mapping coverage and reviewed mapping bindings. Integrity findings remain
degraded even when the audit process succeeds. Coverage gaps remain explicit.
These checks do not establish worldwide catalog completeness, source freshness,
new-release acquisition, complete pricing or completion of historical expansion
plans. `catalog_completeness_proven` is always false.

Workers use the pinned production session pooler with verified CA/hostname,
read-only session and repeatable-read transaction, 60-second SQL deadlines and
three-second lock deadlines. They require at least 15 GB free space and healthy
launch evidence no older than 45 minutes. A shared flock serializes the audits.
Each service has an eight-minute limit, 512 MB memory and 50% CPU quota.

Each attempt creates a unique directory. Its running pointer replaces any old
success before database access. Terminal receipts and reports are immutable;
the atomic latest pointer must match its saved receipt and report SHA-256.
Signals persist failures where possible; an ungraceful kill leaves running
evidence that cannot pass health. Failures do not include provider error text.

The control plane checks runtime SHA, component, active timer, service result,
receipt/report hashes, timestamps, preflight and read-only proof. Evidence older
than seven hours is stale. Enabling a timer alone cannot clear a warning.
Deployment requires actual timer-triggered completed receipts for all three
lanes, independent readback, and preserved rollback runtime pointers. No artifact
deletion or retention change is part of this implementation.
