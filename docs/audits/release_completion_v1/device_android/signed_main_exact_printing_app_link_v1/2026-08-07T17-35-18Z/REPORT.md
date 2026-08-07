# Signed Main Android Exact-Printing and App-Link Proof V1

## Result

Status: `PASSED`

Main SHA `80d30d0ef5f373e8208e01926f276faa705092c9` passed the main-branch Flutter, signed-APK, CodeQL, and legacy-key workflows. Vercel deployed that same SHA to Production. The workflow-produced APK was installed fresh on the disposable Samsung package and verified against the deployed Android App Links authority.

## Release Provenance

- PR: `#192`
- Production deployment: `5798722633`
- Signed APK workflow: `31200311976`
- Signed APK artifact: `9002772994`
- APK SHA-256: `1ebeba31394e0182b90ec9194e2e62b7ed2ddd8db28edca312da26aaad2eaea4`
- Package: `com.grookai.vault`
- Version: `1.0.0 (21)`
- Release certificate SHA-256: `51e518ef647b2bd5c1c91d3d00d08e1fe3192af633b2af6741a67fdce872e033`
- Production `assetlinks.json`: HTTP `200`, JSON, matching package and certificate
- Samsung domain state: `grookaivault.com: verified`

## Physical Journey

1. Installed the exact main-workflow signed APK after removing only the disposable `com.grookai.vault` package.
2. Confirmed `com.grookai.vault.lockedacceptance` remained installed and untouched.
3. Launched `https://grookaivault.com/card/GV-PK-MEW-025` through Android's browsable intent boundary.
4. Android cold-opened `com.grookai.vault/.MainActivity` and rendered Pikachu `MEW 025/165`.
5. Confirmed Normal, Reverse Holo, and Cosmos Holo were independently selectable.
6. Selected Normal before starting Add to Vault.
7. Authenticated the authorized disposable journey account and resumed the pending action.
8. The post-action notification permission prompt appeared only after the pending action completed, proving push registration resumed without preempting the ownership write.
9. The private copy screen rendered `GVVI-FA55C026-000006` with `Printing: Normal`.
10. No `Choose exact printing` guard or add failure appeared.
11. Removed the only test copy through the product UI.
12. Database readback confirmed the test row was archived and zero active rows remained for that exact child printing.

## Auth Automation Safety

The Samsung keyboard did not reliably preserve the existing password in an obscured field. The disposable account was therefore rotated briefly to a deterministic lowercase alphanumeric test password. Production direct auth verified the temporary value before UI use. A guarded `finally` block restored the original password, direct auth verified the restored value, and the temporary value was then rejected. No credential, password, token, or account identifier is stored in this audit.

## Runtime Observation

No fatal Android or Flutter exception occurred. The runtime log contains one independent Pulse mark-seen rejection because a cursor attempted to move backwards. The monotonic database guard rejected it. This did not affect authentication, exact-printing selection, ownership write, private-copy rendering, or cleanup; it remains an explicit item for the final state-matrix and operations review.

## Boundaries

- No direct database mutation was used to manufacture the journey result.
- The only ownership mutation occurred through the signed product UI.
- The test copy was archived through the signed product UI.
- The locked Samsung acceptance package was not modified.
- This audit proves the signed Android gate only; it makes no iPhone or overall-release completion claim.

## Evidence

- `01_https_deep_link_signed_out.png` / `.xml`
- `02_notification_permission_after_action.xml`
- `03_exact_normal_private_copy.xml`
- `04_after_ui_remove.png` / `.xml`
- `05_device_package_and_links.txt`
- `06_filtered_runtime_log.txt`
- `07_release_provenance.json`
- `08_db_reconciliation.json`
- `09_auth_automation_safety.json`
- `summary.json`

