# TestFlight Build 284 Provenance

## Result

TestFlight `1.0.0 (284)` is a valid, App Store-eligible build produced from
commit `33d7ff50bda428439c664c7c6db427b7a66abd9a`.

The locally retained archive and upload evidence reports:

- archive bundle version `284`;
- marketing version `1.0.0`;
- IPA SHA-256
  `9fb1084fbdefd3e11d0f3bf43580868829c6f25c5dda8d8aff2a11036dacc0df`;
- successful signature verification;
- successful App Store Connect upload.

App Store Connect readback reports build ID
`a9ea5e7b-3e76-47db-a885-6bb289a8bce6`, processing state `VALID`, audience
`APP_STORE_ELIGIBLE`, and assignment to the internal Friends and Family,
external friends and family, and external beta groups.

## Device Preflight

The paired physical iPhone 17 Pro is available. It currently has Build 283
installed, so Build 284 must be installed from TestFlight before the governed
clean-account journey begins. Direct IPA installation cannot satisfy the
TestFlight-install requirement.

## Boundary

This was a read-only provenance and device preflight. It created no build,
changed no tester group, performed no public release, and changed no device
application.

## Next Gate

Install Build 284 from TestFlight, execute the clean-account journey on that
physical iPhone, and reconcile the resulting production rows through the
read-only verifier.
