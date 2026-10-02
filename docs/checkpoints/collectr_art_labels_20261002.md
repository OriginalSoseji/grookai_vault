# Collectr artwork label matching — October 2

Local candidate on `feature/collectr-art-labels-20261002` in
`C:/gv_collectr_adventure_20261001`, based on main6363e12ee after released PR579.
Keep all completed named-finish release receipts immutable. This candidate has
not imported a real collection, changed production data or been distributed.

Full Art, Secret and Alternate Art Secret use positive catalog rarity/variant
evidence plus existing English identity, set, name, number and exact-child checks.
Printed modifiers, conflicting rarity, missing alternate variant, grades and
unsupported labels stay held. Source fields are preserved. The server rereads
evidence during save. Shared fixture cases keep TypeScript and Dart behavior
aligned. This changes matching and read fields, with no schema migration.

Private full-export replay: 1872 rows; 1137 ready rows / 1312 copies becomes
1166 ready rows / 1343 copies, with 706 review rows. Added: 29 rows / 31 copies.
Previous selections, manual choices, quantities, source fields and all 64 graded
holds remain unchanged. Both baseline and candidate use the same frozen catalog
with fresh rarity/printing evidence for 19 parents in 15 sets. Parent identity
and set fields were verified unchanged; this is not a full fresh catalog snapshot.

432 focused TypeScript contracts and 106 native tests pass. The isolated HTTP
proof adds real Auth, cookie browser save, independent SQL/RLS readback, original
source preservation, evidence changes after preview, wrong-finish rejection and
duplicate-free retry. Final HTTP, normal-hook and source-hash receipts are under
`C:/grookai_vault_operator_artifacts/collectr_art_labels_20261002`.

Use `GV_COLLECTR_ART_HTTP_PROOF=1` with
`tests/integration/collectr_mtg_import_http_v1.test.mjs`. The retained410 database
is verified before fixture writes and is never reset/migrated. Current source
has414 migrations. Actions modify only new synthetic accounts and identities;
production catalog inspection stays read-only. Physical iPhone checks were
waived and are not claimed. Release remains distinct from local qualification.
