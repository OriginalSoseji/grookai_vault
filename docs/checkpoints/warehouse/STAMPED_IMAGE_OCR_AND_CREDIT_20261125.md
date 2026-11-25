# Stamped image processing: OCR quote repair and credit hold

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

This branch changes only quoting of the existing whitelist and adds a focused
regression test. The test runs the actual OCR route and Python argument parser
with explicitly empty engine responses. It fails on the retained original
source and passes on the repaired source, with no skips. A separate isolated
process used the real original Decidueye image and real Tesseract: processing
completed without the exception. The collector number remained unreadable;
neither that diagnostic nor the parser fix qualifies the physical metadata.

The running service source was unchanged before and after every diagnostic.
No service deployment/restart, production metadata event, normalized asset,
founder approval or image promotion occurred. Normal commit/push, hosted source
qualification and a governed production service release remain unfinished.

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
`stamped-ocr-real-shadow-v1.json`. Earlier failed probe setup and test-harness
attempts are also retained. No new Docker image, volume or persistent container
was created for the image canaries.
