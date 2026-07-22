# Canon Image Full DB Playbook Scan: 2026-07-14

- Package: `CANON-IMAGE-FULL-DB-PLAYBOOK-SCAN-V1`
- Scope: all `card_prints`, all `card_printings`, and canon storage objects in `user-card-images`
- JSON report: `docs/audits/image_truth_v1/canon_image_full_db_playbook_scan_v1.json`
- Markdown report: `docs/audits/image_truth_v1/canon_image_full_db_playbook_scan_v1.md`
- Fingerprint: `e673063a3cad2287b2d944db14bf5b8109fbe6d62487477f6b076f0cee3e95fc`

## Result

The full DB image playbook scan passed the critical gates.

- Parent rows scanned: 53,316
- Child rows scanned: 70,090
- Canon storage objects scanned: 55,025
- Identity rows with canon image paths: 80,206
- Missing storage objects for identity paths: 0
- Non-image storage metadata on identity paths: 0
- Zero-byte identity storage objects: 0
- Rows with selected bad image patterns: 0
- Japanese rows with selected bad image patterns: 0

## Cleanup Backlog

- Unreferenced canon storage objects: 3,080
- Unreferenced suspicious storage objects: 0

No global storage deletion was performed for the unreferenced object backlog because none matched the suspicious image patterns from the Abyss Eye incident. Treat those objects as a separate storage-retention cleanup task, not as image correctness failures.

## Commands Run

```powershell
node scripts/audits/self_hosted_images_wh19a_final_image_hosting_state_scan.mjs
node scripts/audits/image_surface_consistency_scan_v1.mjs
node scripts/audits/canon_image_full_db_playbook_scan_v1.mjs
node --check scripts/audits/canon_image_full_db_playbook_scan_v1.mjs
```
