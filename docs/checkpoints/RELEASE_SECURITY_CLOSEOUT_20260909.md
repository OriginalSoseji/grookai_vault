# Release Security Closeout - September 9, 2026 UTC

## Scope

Patch launch-critical dependency advisories without changing pricing policy,
inventory, permissions, or public release controls. This is one lane of
`RELEASE_CLOSEOUT_20260909.md`, not a declaration of launch readiness.

## Changes

- Dependabot PR 447: Next 16.2.12 to 16.3.4. Both critical Next runtime
  advisories require at least 16.3.3. CI and Vercel preview passed before merge.
- Dependabot PR 446: js-yaml 4.3.1 to 4.3.2, lockfile only. CI passed.
- Pin Sharp 0.35.4 in web and backend, including native packages and libvips
  1.3.3. This addresses the newly reported libheif dependency advisories.
- Update exact-version contract assertions to the installed security releases.

## Verification

Both installed Sharp trees encoded and decoded PNG, JPEG, WebP, and AVIF with
the expected 16 x 24 dimensions. No remote or user image was required.
Web typecheck, lint, full shipcheck and production deployment results must be
read back before this lane is considered deployed.

## Residual Archive Advisory

GitHub alert 61 reports a destination-symlink overwrite issue in adm-zip 0.6.0;
the alert lists no fixed release as of this audit. Do not label it patched.

The backend dependency chain is transformers -> onnxruntime-node -> adm-zip.
Inspection found the import in `onnxruntime-node/script/install-utils.js`, used
to extract selected NuGet native-library entries into a temporary installation
directory. No application source import or user-upload extraction path was
found. This limits observed exposure to dependency installation, not collector
requests; it does not prove the upstream vulnerability impossible to exploit.

Keep dependency installation in isolated builds with untrusted local filesystem
writers excluded. Do not suppress the alert or use a blanket audit waiver.
Recheck the upstream fixed version before the final security release gate.

## Production Boundaries

Merging source does not update pinned production backend workers. Record their
actual deployed SHA separately. No database, Storage, ownership, public store
submission, scanner restart, or retention deletion is authorized by this patch.

Local audit artifacts:
`C:/grookai_vault_operator_artifacts/release_closeout/20260909/`.
