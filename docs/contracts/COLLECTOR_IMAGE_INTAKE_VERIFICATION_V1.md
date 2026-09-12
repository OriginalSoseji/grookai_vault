# Collector Image Intake Verification V1

Date: September 11, 2026. Scope: authenticated collector local preview only.

- Exercise the actual website, local Storage, local Edge Function and existing
  atomic warehouse intake RPC. No mock success, migrations, catalog changes,
  promotion, approval, canonical image repoint, deployment or worker execution.
- Restrict the Edge runtime to warehouse-intake-v1 and its shared dependencies.
  Strip inherited external credentials; no copied .env or linked project file.
- Use only synthetic accounts and a clearly identified transport-fixture image.
  Preserve successful RAW submissions as local review evidence, not canonical truth.
- Verify caller-owned existing image objects and snapshot ownership before invoking
  the service-only writer. Reject foreign/missing paths, duplicate slots, empty,
  non-image MIME and oversized objects. MIME/size validation is not image decoding,
  malware scanning, proof of image content, or permanent immutable evidence.
- Verify candidate, evidence and event readback; wrong-account reads and direct
  authenticated writer calls must be denied. Compare catalog and Vault before/after.
- Preserve artifacts and failures outside Git. Any fixture objects removed must
  have been created by this execution; never overwrite existing objects.
- Once intake is dispatched, a failed/lost response must not trigger deletion of
  possibly committed evidence. Preserve files and disable immediate resubmission.
  This is conservative uncertainty handling, not server-side idempotency or an
  automatic recovery queue. Verify with a real committed request whose browser
  response is deliberately interrupted.
- The local source schema is unchanged. Edge ownership protection does not claim
  transaction-level immutability: owner deletion/replacement after validation and
  service-only internal caller trust remain separate review/promotion concerns.
