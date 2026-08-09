# Physical iPhone Clean-Account Want Match Device Proof

## Result

Status: `PASSED`

TestFlight build `1.0.0 (288)` completed the governed clean-account Want Match journey on a physical iPhone 17 Pro. The production readback passed with zero findings.

## Visible Sequence

1. Search opened `Blastoise & Piplup-GX`, Cosmic Eclipse `#214`.
2. The card page visibly confirmed that the card was saved to wanted cards.
3. Pulse showed one Want Match for the same card, from Poke Javi, in the same region, with `For trade` owner context.
4. The card-centered composer named Poke Javi and the exact card before send.
5. The normal Messages inbox showed one exact card thread for Poke Javi and Cosmic Eclipse `#214`.
6. Want was disabled through the card page.
7. Current and older Pulse contained no stale Want Match after opt-out.

## XCTest Markers

- `GROOKAI_CLEAN_ACCOUNT_SESSION=true`
- `GROOKAI_WANT_ON_VISIBLE=true`
- `GROOKAI_CARD_MESSAGE_STARTED_AT=2026-08-09T05:29:04Z`
- `GROOKAI_DISPOSABLE_WANT_CLEANED=true`
- `GROOKAI_STALE_WANT_MATCH_ABSENT=true`

The message send committed successfully. A post-send assertion initially expected the exact label `With Poke Javi`; the UI correctly rendered the richer label `With Poke Javi • /u/pokejavi`. Database readback found exactly one matching message, and the normal Messages inbox rendered the exact card thread. No second message was sent.

## Privacy

- Permanent artifacts contain no email, password, token, raw user ID, owner ID, match ID, interaction ID, device serial, or message body.
- The Messages screenshot was excluded because it displayed conversation text.
- Three privacy-safe screenshots are retained only as hashes and byte counts in `summary.json`.
- Temporary credentials, login logs, and secret-bearing XCTest source were deleted after the authenticated device session was established.

## Boundaries

- The verifier used a read-only database transaction.
- No database row was manually seeded to manufacture the journey.
- The product UI created the expected Want and message activity.
- Final current Want is `false`.
- The generated match is retained as `stale` with reason `canonical_want_removed`.
- Active match count is `0` and stale Pulse visibility is `0`.

