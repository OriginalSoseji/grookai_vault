# Integrated eBay seller candidate — October 28, 2026

The normal signed-in native and web app now have an owned-copy seller workspace
in source. Open it from **List on eBay** on an exact copy, or **eBay listings** in
Vault tools. This is a release candidate; installed Samsung build508 has not yet
received these seller screens.

Physical-copy photos, condition and item specifics, seller policies, actual fee
review, a separate publish action, withdrawal, uncertainty reconciliation and
confirmed sale closeout share one durable backend authority. The client retains
drafts and stable retry IDs. Provider credentials never enter client storage.

Local qualification completed full fresh480 replay, retained479→480 upgrade,
private-photo byte recovery, real Auth/Storage/shared-SDK concurrency and lost
acknowledgement scenarios, and four concurrent owner sale closeouts producing
one canonical disposition. Fresh and upgraded schemas have zero remaining diff;
1,390 security entries, 79 seller fingerprints and all39 intake fingerprints
match. All seller controls remain disabled with empty allowlists.

See [the qualification record](../audits/ebay_seller_publisher_20261028/CANDIDATE_QUALIFICATION.md)
and its hash-bound release manifest. Provider responses in local runtime checks
are fixtures; they establish no actual eBay grant, fees or publication.

The next release gates are normal hooks and hosted checks, exact PrePush,
official migration deployment with controls off, production web readback,
signed integrated Android delivery and actual seller consent/provider readback.
The collector supplies the physical card, photos, price and final listing action.
