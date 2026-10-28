# Seller interruption recovery — October28,2026

The integrated candidate in PR830 now includes forward schema481, preserving
the exact frozen480 bytes. Samsung and the normal QA app still run508. Signed509
is held; corrected native packaging uses510. Production remains479 and seller
controls have not been enabled. No actual provider grant or listing was made.

Completed qualification:

- Expired workers are retired durably without releasing their reservations.
  An acknowledged preparation handoff remains resumable after lease expiry.
- A fresh provider read can recover a claim that never reached publication
  intent. A possibly late publication keeps its reservation even while the
  provider still reports unpublished. A later active listing is bound safely.
- Old worker nonces cannot advance, and an old observation replay cannot
  release a newer publication's reservation. The collector must confirm again
  after a recovered review returns to prepared, even at the same revision.
- Native and web expose Check eBay status for preparing, publishing and live
  listings. Web also supports observing a live listing's sold/ended state.
- Thirteen rollback authority checks, eleven deliberate drift rejections and
  idempotent rollback passed. The old480 gates and labs remain preserved.
- Official CLI fresh reset/push/no-op passed for481 with the declared647-alias
  historical prerequisite. A separate479 lab was populated before upgrading:
  two Auth users, two canonical copies, one private photo and one legacy seller
  account survived with their original data and credential bytes unchanged.
- Nine actual Auth/Storage/shared-backend SDK scenarios passed, including
  expiry before/after publication intent, safe handoffs and a late listing.
  Exactly one fixture media upload, inventory write, offer, publication and
  withdrawal occurred. Four concurrent owner closeouts produced one canonical
  sale; peer and unconfirmed requests were denied.
- Fresh/retained targets have zero full public-schema differences, all1392
  security entries equal,81 seller fingerprints and39 unchanged intake objects.
  Both targets end with seller controls off and an empty allowlist.
- The read-only production479 baseline matched the retained historical schema.
  Local qualification wrote nothing to production.

The SDK provider transport is injected fixture data, not actual seller consent,
provider eligibility, real fees or a public eBay listing. The first recovery SDK
harness correctly hit the private operation table's update restriction. Its
safe preparation handoff was resumed/retired through existing authority and
preserved; the corrected harness reused its Auth users with local-only SQL fault
injection. The first target comparison ran during that canary and correctly
refused enabled controls; comparison passed after the canary turned them off.
The fresh relay initially rejected its prior480 project binding; a separately
recorded481 binding restored the empty lab before reset/population. No populated
lab was reset and no production permissions were widened.

The separate recovery manifest binds the frozen migrations, worker/qualification
sources and28 private evidence files. `-EbaySellerPublisherRecoveryReleaseV1`
requires exact pending112000/174000, a clean committed tree, full target checks
and a new private output. Normal hooks, hosted checks, final PrePush, official
CLI deployment, signed510 installation, production HTTP and actual seller
consent/readback remain required. Registered callbacks still use eBay defaults.
