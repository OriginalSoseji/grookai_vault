# Android Want Match Supplemental Interpretation V1

The raw `REPORT.md` and `summary.json` were produced by an iPhone-specific verifier. They are preserved unchanged. Their overall `failed` status is expected because the device was a Samsung Galaxy S22 Ultra, the application was not installed from TestFlight, and no iPhone model family was supplied.

For the physical-Android scope, the underlying evidence passed every product confirmation:

- exact card found;
- Want enabled;
- current Want Match visible with exact owner/source context;
- card-centered message sent before opt-out;
- Want disabled;
- active match count returned to zero;
- stale match disappeared from Pulse;
- no invalid or post-opt-out delivery;
- no event-emission failure;
- database readback was read-only and identifiers/content were redacted.

This interpretation does not change the raw verifier result and does not satisfy the physical-iPhone/TestFlight gate. It prevents an iPhone-policy mismatch from being misclassified as an Android functional failure.
