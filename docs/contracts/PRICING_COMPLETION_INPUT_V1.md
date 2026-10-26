# Pricing Completion Input V1

This is a deterministic, built-in-only intake contract. It reads no files, environment variables, credentials, databases or network services. The caller supplies retained source bytes and explicit evaluation time. Intake creates unresolved work observations; it never writes catalog truth, publishes prices or proves a repair successful.

## APIs

`importPricingBacklogV1({ reportText, identityGapsText, artifactHashes, dimensionEvidence? }, { now, maxAgeMs? })` imports the existing `TCGPLAYER_PRICING_BACKLOG_POLICY_V1` report and identity-gap JSONL. `now` is epoch milliseconds; default maximum age is 24 hours. `artifactHashes` must contain SHA-256 entries named `summary.json` and `identity_mapping_gaps.jsonl`. Both original UTF-8 byte strings must match before parsing. Use the matching retained run directory and its hash manifest, not unrelated `latest` pointers. Hashes establish content consistency; they are not signatures or source authority.

The importer checks safe nonnegative integer counts, selected/published/decision partitions, primary-reason partitions, lane counts, every identity row and duplicate stable identities. Unknown reasons and invalid upstream findings fail closed. No row is silently discarded as unsupported or resolved.

`normalizePricingCompletionSnapshotV1(snapshot, { now, maxAgeMs? })` accepts a full typed producer snapshot. `pricingCompletionIntakeKeyV1(identity)` provides the canonical SHA-256 identity digest used for duplicate detection. Queue implementations may prefix their own key; the normalized `identity` object is the shared contract.

## Typed snapshot

Required fields are `schemaVersion: "pricing-completion-input-v1"`, `sourceRunId`, `observedAt`, `coverage` and `observations`. Timestamps use UTC ISO representation. Each observation has:

- `identity`: source `{kind:"source", provider, category, productId, subtype, currency, condition}` or master `{kind:"master", printingId, currency, condition}`. All dimensions are exact nonempty strings. Currency is an uppercase three-letter code. Source product/subtype and exact master printing ID retain edition/finish distinctions. Observation IDs and run IDs are evidence, never durable identity keys.
- `condition:"NOT_CONDITION_SPECIFIC"` is a reserved pricing-scope sentinel for the existing app's market quote, not a physical card condition. It requires `evidence.priceBasis:"TCGPLAYER_MARKET"` and `physicalConditionVerified:false`. The fixed source/read-model adapters can establish that basis without inventing NM. Legacy artifacts without bound basis evidence remain `UNKNOWN`. Completion of this scope does not establish condition-specific prices.
- `reason`: a recognized primary reason. Source reasons are `missing_active_source_mapping`, `missing_mapping_method`, `missing_printed_number_evidence`, `missing_canonical_printing_identity`, `missing_positive_market_price`, `cosmos_assignment_required`, `cosmos_exact_finish_required`, `special_variant_v1_1` and `edition_bound_pricing_authority_required`. Master-side reason is `missing_published_price`.
- `sourceRunId`: must match its snapshot. `scope` identifies the provider/category/set or other exact batch boundary. `evidence` is a JSON object capped at 128 KiB.
- Optional `owner` and `nextAction` override the deterministic lane defaults. They describe routing and do not start processes or confer write authority.
- Optional `priorityMetadata` contains `owned` (boolean or null), `retailer` (string or null), and `evidenceRef`. Known ownership or retailer values require evidence. Verified ownership adds 80 priority points; verified retailer association adds 20. A product name alone never establishes ownership or a stamped retailer printing. The legacy import preserves both as unknown and uses priority zero.

The returned `observations` are queue-compatible and add evidence provenance plus `versionDigest`. Stable identities survive new observation IDs/source runs while the evidence-version digest changes. Duplicate identities within one snapshot are rejected rather than losing source rows or arbitrarily selecting one.

`edition_bound_pricing_authority_required` belongs to `variant_support` and routes to `tcgplayer-edition-authority-review-v1`. It preserves the exact source subtype and the unresolved edition-authority hold. Recognizing this reason does not verify an edition assignment, infer canonical bindings, permit a price publication or close an item. Other unknown reasons still reject the snapshot. This explicit addition supports the replacement published run captured on October 14; it does not weaken producer, source-run, publication, freshness or count reconciliation checks.

## Coverage and freshness

Coverage has independent `sourceToMaster` and `masterToPrice` entries. Each has `status` (`complete`, `partial`, `unknown`). Known coverage also needs `sourceRunId`, `observedAt`, `evidenceRef` and `expectedUnresolved`. Complete means the producer enumerated its entire declared direction, not that repairs are complete. Master-side coverage must enumerate every intended exact printing/currency/condition scope, including cards with no warehouse product.

Source coverage includes six lane entries: `identity_mapping`, `catalog_evidence`, `exact_printing`, `source_price`, `finish_assignment`, `variant_support`. Each records status and expected unresolved count; output also records imported count. A complete direction requires all six lanes complete and matching row/aggregate totals. Unknown coverage cannot contain rows. Missing partial lanes remain unknown, never zero-resolved.

The existing export enumerates identity rows only. Its report knows other lane counts but does not provide their records. Therefore the importer always returns partial source coverage, with unknown other-lane enumeration, and unknown Master Index coverage. Neither zero identity rows nor all rows being unsupported establishes global completion. The report run completion time, not a newly generated export timestamp, controls source freshness.

`summary.complete` is true only when both directions have fresh, complete enumeration with zero unresolved observations. Stale snapshots are still useful historical queue evidence but cannot establish current completion. A producer's completeness declaration is not an independent production audit; the snapshot and queue outcomes must both pass completion checks.

## Missing legacy dimensions

The retained identity JSONL omits currency and condition. Intake preserves `currency:"XXX"` and `condition:"UNKNOWN"`, sets `identityDimensionsVerified:false`, and requires enrichment in `nextAction`. These are unknown-dimension work identities, not priceable identities or implicit USD/NM assumptions. They must not be auto-published or auto-closed, nor silently merged with later known-dimension identities. A future enrichment adapter must explicitly connect the evidence and retain history.

If independently verified uniform dimensions exist, callers can supply `dimensionEvidence` with `currency`, `condition`, `evidenceRef`, `sourceRunId` and `identityGapsDigest`. Run and input digest must match. The adapter checks these bindings; it does not authenticate external evidence or infer that a market price is equivalent to an NM condition price.

## Operational output

Output includes `snapshotId`, source run/time, `contentDigest`, freshness, direction/lane coverage, normalized observations and summary. The legacy import adds original report/input hashes and retained upstream counts. Unknown Master coverage is `null`, not zero. `actualProductionRepairs` is always zero at intake. Price availability can only be established by a separate independent application-read-path verifier.

Tests cover malformed counts, digest mismatches, duplicate stable identities, unknown reasons, unsupported rows retained unresolved, run changes without identity churn, exact editions, master-side absence, stale/future snapshots and evidence-backed priorities. Run candidate code only in the approved isolated test environment; this contract grants no host execution or production access.
