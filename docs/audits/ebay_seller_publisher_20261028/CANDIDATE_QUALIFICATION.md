# Seller candidate qualification — October 28, 2026

This is an integrated native/web candidate. Production is still schema479 and
build508 at this checkpoint. No real eBay account has been linked, no real
provider token grant has run, and no actual listing has been published.

The owner flow includes exact-copy Vault entry points, a listings workspace,
owner-bound OAuth return, private physical-copy photos and removal, current
condition/aspect/policy choices, decimal price entry, unpublished preparation,
readable frozen review, actual listing-fee receipts, separate publication
confirmation, withdrawal, reconciliation and explicit owner sale closeout.
Draft IDs, pending operations and photo retries survive client restart. An
unknown saved condition remains unselected until the collector chooses it.

## Completed local qualification

- 113 targeted contract tests and 12 backend photo/Media tests passed.
- 21 native tests passed, including recovery, owner isolation, phone/tablet
  light/dark layouts at 150% text and confirmation invalidation.
- Browser coverage includes unknown condition, decimal entry/reload, lost save,
  safe preparation handoffs, lost publication, expired fees, frozen human terms,
  photo removal, replacement drafts and mobile/desktop light/dark geometry.
- Native analysis, web type checking, lint and strict production build passed
  before the final navigation-entry additions; normal full hooks remain required.
- The new exact479→480 scope passed a read-only production baseline comparison.
  It does not widen the consumed478/479 gates or modify historical migrations.
- Full fresh replay used the official CLI reset and push, with the explicit
  historical647-alias prerequisite. Official CLI no-op passed. No populated lab
  was reset. A retained lab was populated at479 before its CLI upgrade to480.
- Two retained Auth users, two canonical owned copies, one private object and
  an existing legacy seller account survived upgrade. Existing credential bytes
  remained unchanged; owner token-table reads were revoked. Signed owner SDK
  download verified the exact original private-photo bytes.
- Six actual Auth/Storage/shared-backend SDK scenarios passed: OAuth nonce and
  single-use exchange authority, concurrent saves, private-photo readiness and
  ownership, concurrent bounded preparation, publication reservation plus lost
  completion recovery, withdrawal/readback and exclusive token refresh.
- A separate signed-owner SDK closeout test issued four concurrent requests.
  Exactly one canonical sale disposition was written, with the confirmed USD12.34
  fixture price. Peer, unconfirmed and conflicting-price requests were rejected.
- Fresh and retained480 have zero complete public-schema diff, exactly matching
  1,390 security entries, 79 seller object fingerprints and all39 unchanged intake
  fingerprints. Seller controls are off with an empty allowlist in both labs.
- Seven deliberate drift faults were rejected. Idempotent candidate replay
  passed in a rollback transaction. Production writes during qualification: zero.

Provider responses in the SDK scenarios are injected fixtures. The Media path
uses the actual image normalization and pinned transport implementation, with
fixture HTTP responses. These checks do not establish actual seller eligibility,
live consent, real fees, real order fulfillment or live publication.

## Preserved verification recoveries

The fresh480 replay succeeded before a post-run verifier compared its ledger
against an old479 conditional. A separate verifier checked the existing480 lab
and official CLI no-op; it did not reset or reapply the completed migration.

The first SDK preparation fixture omitted the required aspect data type. The
worker recorded failure before any inventory/offer/publication mutation. The
corrected second attempt reused the same real Auth users and retained the first
attempt's failed operation and owned copy.

The retained upgrade succeeded and exact row comparisons passed before its
verifier tried an owner-only RPC with a system session. That call correctly
failed authentication. Verification resumed with normal owner Auth SDK sessions;
the populated lab and applied migration remained intact.

## Release still required

Normal commit/push hooks, applicable hosted checks, exact release PrePush,
official production migration deployment with controls off, production web
readback, signed integrated Android delivery and actual seller consent/readback
remain release gates. Registered eBay redirect configuration must point to the
qualified deployed callback. Physical copy, photos, price and final publication
remain concrete collector choices in the app.
