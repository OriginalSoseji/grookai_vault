# Prismatic alias discovery read repair V3

Status is active for the atomic release of the approved Prismatic discovery repair.
V3 supersedes the V2 package admission. The identity, visibility, retained-object
and protected-state requirements in V1 and V2 continue to apply.

The release contains `20261117190000_prismatic_alias_discovery_v3.sql`, with the
final definitions already verified together in the V2 labs. All thirteen read
objects are installed in one transaction. The two earlier local drafts retain
their original bytes in lossless gzip archives under
`supabase/migration_drafts/prismatic_alias_discovery_20261116`.
Existing populated labs keep their original ledgers and source files.

The V3 binding pins the atomic migration and archived drafts. Qualification
requires the 496 unchanged historical migrations, a genuine fresh local CLI
reset and full replay, a populated 496-to-497 CLI upgrade, rollback and
idempotence, full protected-state equality, anonymous and authenticated reader
checks, and complete schema and security comparison. Fixtures are explicitly
synthetic and confined to unlinked internal-network labs.

`-PrismaticAliasDiscoveryReleaseV3` accepts `AuditLinkedSchema` and exact-ID
`PrePush`. It checks the canonical project, fresh production496 schema/security
parity, exact source bytes and successful replay/runtime receipts. PrePush also
requires clean committed source and the normal managed checks. Publication uses
the official CLI with the same frozen package and independent readback of
schema, permissions, discovery behavior and protected production records.

The repair consumes the existing approved180 aliases. It changes nine read
functions and four invoker views. Canonical identity, ownership, source
mappings, printing truth and market history remain governed by their existing
contracts.
