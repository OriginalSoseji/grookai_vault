# Master Index Source Independence

Date: 2026-09-17.
Status: Local source-policy repair with offline replay; production data unchanged.

## Finding And Repair

The classifier and strict guard counted distinct URL hostnames as independent
authorities. Sneasel MEP 020 Cosmos had two records, but both were TCGplayer
catalog channels: product 664055 and a TCGplayer Pro storefront for that product.
That does not establish two independent finish confirmations.

TCGplayer, its API/Pro subdomains and TCGCSV now share the authority key
`tcgplayer.com`. Match exact domains and domain suffix boundaries, not arbitrary
substrings or caller-supplied authority fields. Keep both original source URLs,
source keys and snapshot references. A single supported claim remains recorded;
it no longer satisfies the two-authority `master_verified` threshold alone.

This is a bounded known-channel rule, not proof that every other retailer or
aggregator is independent. Do not infer finish completeness from source counts.

Primary references inspected September 17:

- https://help.tcgplayer.com/hc/en-us/articles/201574827-How-do-I-list-individual-products
  describes the catalog and its Marketplace/Pro inventory channels.
- https://tcgcsv.com/ describes its TCGplayer API product-data origin.

## Offline Replay

Inputs are hashed in the immutable operator report:
`C:/grookai_vault_operator_artifacts/tcgdex_mapping_review_20260917/source-authority-offline-replay-v1.json`.

- 40,656 current English Master Index printing rows inspected; zero without
  evidence references. One row's known-channel authority count changes.
- Sneasel retains its Cosmos evidence, but needs independent corroboration for
  two-authority verification. No source bytes or persisted index rows were edited.
- Reconciled all 33 historical candidates against the active index. Twenty-eight
  remain index candidates, not apply authority. Five historical assertions are
  absent from the current index and must not be inserted from the older snapshot:
  MEP 018-021 generic Holo, and Prismatic Evolutions Lugia ex 082 Normal.
- The active MEP claims are already Cosmos. Lugia's active claims are Holo and
  Stamped; their presence is not authorization to change existing production rows.
- The 25 McDonald's Holo candidates retain their separate frozen executor. The
  remaining Luxray, Tyranitar and Pikachu cases retain identity/dependency review.

No network/provider calls, database access or writes were used by this replay.
The test replays the original MEP fixture: all four Cosmos facts and all eight
evidence records survive; three remain two-authority verified, Sneasel does not.

## Ingestion Practice

1. Preserve source data and exact treatment labels before normalization.
2. Count known shared catalog channels once; raw evidence count is not authority count.
3. Compare against the current index and explicit historical suppressions before
   proposing a missing child. Old publishable shards are not current authority.
4. Retain weaker/conflicting evidence for review; never invent another finish or
   silently upgrade a claim to unblock a writer.
5. Freeze source-bound set review and run the existing bounded mutation contract.
   Missing discovery data is not permission to delete historical facts.

## Prior Gate Receipt

PR #490 merged at `c84e088581577c7b699fb73e63bb4a3364075cce` from tested head
`aa61ef8e24eb6685b935d76d81570f7003a10fa3`. The merged tree matched the expected
tree `6ff32133899274fc362493c67871b97330b55b68`, preserving concurrent founder
snapshot updates. Normal commit and push gates each passed 3,880 Node tests
(three preexisting opt-in skips), web checks/build, Flutter analysis and 728
Flutter tests. No hooks were bypassed. Integration is not backend deployment:
the immutable MEE and TCG runtimes still need separately governed reconciliation.

## Remaining Gate

Run normal release checks and integrate the source-policy repair. The next
scheduled Master Index rebuild must expose the weaker Sneasel status unless
new independent evidence is added; a source-outage baseline fallback is not a
fresh verification. Preserve historical data and frozen approvals. Continue
source adjudication, bounded production reconciliation and deployed caller
verification; this checkpoint does not declare catalog repair complete.
