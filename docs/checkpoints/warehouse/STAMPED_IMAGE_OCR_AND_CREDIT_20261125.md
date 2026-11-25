# Stamped image processing: regional OCR failure and credit hold

The whitelist quotation repair from source `385edb0d7e64a47476883fc579a1f076db9957e3`
passed normal commit/push and all hosted checks, then deployed with independent
service/API verification. The prior app backup, four protected files,
dependencies and credentials were preserved. The first execution stopped before
any remote mutation because the server clock lagged the workstation by about
19 seconds; that attempt remains consumed. A distinct attempt ran only after
the remote clock entered its unchanged technical window, with one app-file
replacement and one service restart. No clock or approval guard was relaxed.

A subsequent read-only check processed all 33 originals: 32 completed OCR and
one returned `ocr_processing_failed`. None yielded a collector number. The
failing XY10 number-12 League-stamped Reverse original reproduces a Tesseract
exit status of `-8` inside one number-region scan. This candidate handles only
that specific regional engine exit, records an explicit partial-result warning
and region/error details, and continues the remaining number regions. Other
engine errors still fail closed. A missing number stays missing; OCR observations
remain advisory and do not qualify identity or authorize any image publication.

The exact 33-candidate classification release completed on November 25, 2026.
Production rollback, apply, server-read-only replay and every independent
data/public/security/original-byte comparison passed. The durable change is 99
UPDATE statements on 33 candidates and 99 SYSTEM events. All three named
attempts are consumed. Closure SHA256:
`521dde87674d7668d9c90f7be992de4585d92dbeac03477c2898afd2c0ae7d20`.

All 33 candidates are REVIEW_READY. None has metadata extraction events,
normalized image events, founder approval, staging or promotion. Classification
does not authorize those later writes. Original intake source and receipts stay
retained; do not rerun them against the advanced candidate states.

The first genuine image extraction canary was BLOCKED. Read-only diagnostics
identified two independent causes:

- The modifier OCR whitelist contains an unquoted apostrophe and spaces.
  Pytesseract's argument parser raises `ValueError: No closing quotation`.
- The configured model API returned HTTP429, `credit_balance_exhausted`,
  `insufficient_quota`. Authentication/model listing succeeded; no replacement
  credential or project is inferred from that result.

The initial repair changed only quoting of the existing whitelist and added a
focused regression test. That test runs the actual OCR route and Python argument parser
with explicitly empty engine responses. It fails on the retained original
source and passes on the repaired source, with no skips. A separate isolated
process used the real original Decidueye image and real Tesseract: processing
completed without the exception. The collector number remained unreadable;
neither that diagnostic nor the parser fix qualifies the physical metadata.

The current candidate also tests the native regional failure, preservation of
an independent number observation including printed leading zeros, and rejection
of other engine failures. The candidate's normal commit/push, hosted source
qualification and guarded app-only release remain unfinished. The deployed
quotation repair stays retained as its exact base. Neither repair writes
production metadata events, normalized assets, founder approvals or canonical
images. Existing temporary local OCR debug output is not canonical image storage.

The owner selected restoration of credit on the existing account. That is a
planned external action, not confirmation that credit is restored. Keep the
existing credential/project unchanged and do not repeat inference requests
until restoration is confirmed. Then qualify a new genuine extraction canary,
exact name/number/set/stamp preservation and derived image preparation before
the separate founder and image-only promotion gates.

Operator evidence is retained under
`C:/grookai_vault_operator_artifacts/all_stamped_reverse_holos_20261124/`:
`stamped-classification-production-closure-v1.json`,
`stamped-service-exceptions-v1.json`, `stamped-service-identify-cause-v1.json`,
`stamped-ocr-quote-red-v3.json`, `stamped-ocr-quote-green-v3.json`, and
`stamped-ocr-real-shadow-v1.json`. The subsequent deployment and diagnostic use
`stamped-ocr-service-deployed-handoff-v1.json`,
`stamped-ocr-originals-live-v1/result.json`,
`stamped-ocr-image-failure-diagnostic-v1.json`, and
`stamped-number-region-regression-red-v1.json` /
`stamped-number-region-regression-green-v1.json`. Earlier failed probe setup and test-harness
attempts are also retained. No new Docker image, volume or persistent container
was created for the image canaries.
