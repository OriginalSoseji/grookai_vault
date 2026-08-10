# iOS Candidate 289 Install And Read-Only Launch

## Result

Status: `BUILD 289 INSTALLED - READ-ONLY SURFACES PROVEN - FULL JOURNEYS OPEN`

The physical iPhone 17 Pro now has TestFlight build `1.0.0 (289)` installed.
CoreDevice readback proves bundle `com.cesar.grookaivault`, version `1.0.0`, and
bundle version `289`. The device was unlocked, Xcode UI automation initialized,
and the selected read-only candidate tests passed.

## Candidate Identity

- Application source: `a8ec3d27808fd100cbb8e544032ee479e9632f24`
- App Store Connect build ID: `dc5801e6-e1fd-42ef-b476-768e5ff5d411`
- IPA SHA-256: `27619987ad4121347dbbfa2ef68a840d4ccc5139757f6f14d28a31a3660a09e1`
- Device: iPhone 17 Pro, iOS `26.6`
- Device identifier: `7828E26C-BC77-5F00-BDEC-3545864095CB`

## Proven

- TestFlight build-discovery preflight passed `1/1` and visually showed
  Grookai Vault `1.0.0 (289)` as installed and openable.
- Direct candidate launch passed `1/1`; signed-in Pulse rendered instead of a
  white screen or startup error.
- Eight additional scoped read-only tests passed `8/8` with no failures:
  Search landing, target search results, exact card detail, full card page,
  Account top and lower navigation, Messages, and Pulse readback.
- The query `Blastoise Piplup 214` returned the expected Blastoise & Piplup-GX
  card at rank one.
- Retained screenshots show card images rendering on Search, exact card detail,
  and the full card page.
- The exact card surfaces expose set, collector number, GV-ID, and printing
  controls.

## Privacy Handling

Raw TestFlight, Account, Messages, and verbose accessibility artifacts contain
private account or message content. They were retained outside source control.
Their hashes are recorded in `private_evidence_hashes.json`. Only non-sensitive
screenshots are included in this audit.

## Separate Observation

The full card page displayed `No pricing data available` for Blastoise &
Piplup-GX. This audit does not determine whether that is expected before an
exact printing is selected or is a pricing defect. It is recorded as a separate
pricing-truth follow-up and did not fail this read-only route test.

## Boundaries

- No mutating XCUITest was selected.
- No intentional database or collector-data write was executed.
- No Want state was changed.
- No message was sent.
- The signed-in session was not removed.
- App data was not cleared.
- No public release or soak start occurred.

## Not Yet Proven

- Signed-out Journey A and preserved login continuation on build `289`.
- Clean-account Want-to-match-to-message-to-opt-out Journey C on build `289`.
- Signed-out locked-feature Journey F on build `289`.
- Remaining iPhone and Android state-matrix cases.
- Genuine fresh-user comprehension.
- Google Play account and listing readiness.
- The final 72-hour soak.

## Exact Next Gate

Run the signed-out iPhone Journeys A and F with a restorable session strategy,
then execute the governed clean-account Journey C with before/after database
reconciliation and net-zero cleanup. Do not start the soak until every non-soak
gate is proven.
