# POKEMON_PLAYABLES_ENGINE_CONTRACT_V1

## Status

- Active governance contract, established by owner direction on 2026-11-12.
- Engine implementation, data acquisition, and consumer release are not complete or authorized by this document alone.
- Delivery order is mandatory: build and verify the engine, then integrate search and highlights.
- No existing live schema, source coverage, provider permission, or card classification is asserted here.

## Purpose

### Owner correction — simple V1, 2026-11-17

The owner clarified that the immediate goal is to show playable cards and that the accumulated review process was excessive. The following V1 delivery scope takes precedence over the later detailed review and acceptance requirements in this document.

- V1 classifies repeated inclusion in completed, published physical Standard decklists dated within the rolling 30-day window. It records the publisher's event-date basis explicitly.
- Use the approved starting support thresholds of three events and 20 lists overall, and two events and three using lists per gameplay identity.
- Resolve source coordinates through existing active canonical mappings and verify current identity hashes. Preserve all canonical card, printing, ownership and pricing truth.
- Share usage across versions whose retained structured mechanics match exactly. Different mechanics and ambiguous identities remain separate or held.
- Compute qualification deterministically in the backend and publish a bounded, precomputed read model with coverage, source attribution and expiry. Display its meaning as recent Standard decklist usage.
- V1 acceptance requires working acquisition/original integrity, exact matching, support counting, variant sharing, expiry, safe publication/readback and a real current sample. Per-card manual gameplay/legality review tasks and a separate human calibration project are deferred from this initial usage feature.
- Source collection and copied material still follow documented access/license scope. Card-level factual output is independently computed by grookai.
- Integrate `playable` / `playables` search and highlights after verifying this smaller engine. Existing canonical identity, search-filter correctness, brand and public-data boundaries remain binding.

The detailed review machinery below is retained for the stronger exact-print tournament-eligibility capability. Its pending tasks do not block this explicitly scoped V1 usage signal.

Build the backend engine that identifies current competitive Pokemon playables for grookai vault. Its published output will drive the later `playables` search filter and card highlights across web and native.

The engine owns competitive evidence, qualification, freshness, and publication. A manually maintained UI flag, search keyword alias, or client-side card-name list is not an implementation of this engine.

## Authority and Boundaries

This contract adds a separate competitive evidence domain. It does not replace or amend canonical identity, printing truth, ingestion, ownership, pricing, or existing search authority.

Binding authorities include:

- [Master Rulebook](../GROOKAI_RULEBOOK.md) and [Contract Index](../CONTRACT_INDEX.md)
- [Ingestion Pipeline](INGESTION_PIPELINE_CONTRACT_V1.md) and [External Source Ingestion Model](EXTERNAL_SOURCE_INGESTION_MODEL_V1.md)
- [Card Print Identity Subsystem](CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.md), [Printing Truth](PRINTING_TRUTH_CONTRACT_V1.md), and [External Mapping Alias Governance](EXTERNAL_MAPPING_ALIAS_GOVERNANCE_CONTRACT_V1.md)
- [Stabilization](STABILIZATION_CONTRACT_V1.md) and [Vault Instance Identity](GV_VAULT_INSTANCE_CONTRACT_V1.md)
- [Smart Search](GROOKAI_SMART_SEARCH_V1.md), [AI Product Boundaries](GROOKAI_AI_PRODUCT_BOUNDARIES_V1.md), and [Pricing Evidence](PRICING_EVIDENCE_ENGINE_V1.md)
- [Backend Architecture](../BACKEND_ARCHITECTURE.md), [Workers Guide](../WORKERS_GUIDE.md), and [Production Readiness Gate](../release/PRODUCTION_READINESS_GATE_V1.md)
- [Codex Guardrails](CODEX_GUARDRAILS_CONTRACT_V1.md) and [Migration Maintenance](GV_MIGRATION_MAINTENANCE_CONTRACT.md)

No frozen contract is extended by introducing gameplay-equivalence links. Those links are separate, reviewed competitive metadata attached to existing canonical identities.

## Scope

### Initial engine scope

- Pokemon first; English physical cards and Standard format are the initial target.
- Pokemon, Trainer, and Energy cards are eligible regardless of rarity, artwork, finish, price, or ownership.
- Rolling 30-day competitive evidence, with daily acquisition/recalculation as the operating target.
- Source acquisition, raw receipts, normalization, validation, exact catalog matching, gameplay equivalence, independent legality checks, deterministic qualification, and published read models.
- A bounded initial source set and limited reviewed coverage are acceptable when explicitly disclosed.
- Web and native eventually consume the same published meaning of playable.

Before publication, the exact regional ruleset, card-pool effective dates, and permitted event populations must be pinned. Online results may contribute to the physical Standard target only when their relevant card pool and ruleset are proven compatible. Otherwise they remain separate or excluded.

Owner clarification, 2026-11-15: tournament results are not a product requirement for initial playables. The initial signal may use repeated inclusion in current published Standard tournament decklists, without requiring wins, standings, placements or opponent results. This evidence basis must be explicit and versioned in policy, source admission and output. Published list inclusion does not establish actual match participation or performance. Registration-only lists must not silently become published tournament-deck evidence. Current legality, exact identity, reviewed equivalence, event/date scope, independent support, coverage, source rights and publication acceptance still apply. No numeric threshold or actual source is approved by this clarification.

### Deferred scope

- One Piece, MTG, Pokemon Expanded, Japanese-domain publication, and TCG Pocket.
- Tournament history beyond the active month, historical backfills beyond that window, and historical meta comparisons.
- A 0-100 meta score, staple/tech tiers, price predictions, demand claims, and automated inventory recommendations.
- Tournament hosting, player rankings, player profiling, and public decklist archives.
- Resolver, badge, card-detail, or Vault UI implementation before the engine acceptance gate.

## Invariants

### 1. Engine-first delivery

The required lifecycle is:

```text
approved source acquisition
  -> private raw_imports receipt
  -> deterministic normalization and event/deck validation
  -> reviewed canonical matching and gameplay-equivalence links
  -> independent current legality and printing eligibility
  -> versioned competitive qualification
  -> verified atomic publication
  -> later resolver and highlight consumers
```

The competitive path ends in its own read model. It is not a canonical card-promotion path. New or missing catalog identities stay unmatched/review-only and require the existing separate canon process.

Reviewed manual imports and organizer/player submissions may seed the engine. They must traverse the same evidence and qualification gates. A reviewer cannot set a positive playable flag without supporting evidence and the published policy.

### 2. Source admission and provenance

Owner clarification, 2026-11-15: grookai independently computes its own playable classification. A provider's approval of that label, a permission email, partnership or bespoke license is not inherently required. Source review must distinguish the collection/access basis, any copied material and the independently computed factual output; it must not presume a provider owns grookai's classification. Published terms, an applicable license, direct supply or another documented applicable basis may support source admission without correspondence. Existing `permission_reference` and `allow_derived_publication` fields record the reviewed basis and public-output scope; they do not require a provider consent letter. This clarification does not authorize bypassing authentication, access controls or applicable collection restrictions, copying another party's expressive analysis, or automatically declaring any particular source admitted.

- No provider, API, scraper, commercial reuse right, or redistribution permission is approved by this contract.
- The engine must not require a particular third-party API. Adapters may use permitted published material, authorized exports, direct submissions, or an independently admitted API.
- Each source admission records access method, permitted use, attribution, retention/deletion requirements, rate limits where applicable, and the basis/date of review.
- Public accessibility alone is not permission for automated collection or commercial reuse. Changing an API integration to scraping does not bypass source restrictions.
- External input enters `public.raw_imports` with source isolation, payload kind, upstream identifiers, original payload, retrieval time, and integrity/provenance metadata. Manual transcription retains its original source artifact or permitted receipt and reviewer identity; it must not masquerade as an original provider response.
- Raw evidence is private. Public consumers receive only admitted fields, explanations, source references, and attribution allowed by the source policy.
- Collect only needed player data. Stable cross-event player profiles are not required for card qualification. Event-scoped entries suffice where supported.

### 3. Current window and retention

For an evaluation timestamp `as_of` in UTC, eligible event evidence satisfies:

```text
as_of - 30 days < played_at <= as_of
```

- Use event/play time under a versioned source date policy, not ingestion time. Late downloads do not make old results current.
- Date-only timestamps require an explicit timezone/date policy or review. Future, ambiguous, canceled, unfinished, and unverified events must not silently qualify.
- Event evidence expires at `played_at + 30 days`; an equality at that boundary is expired. Consumers must enforce expiry even if the refresh worker fails.
- Recalculate qualification when evidence expires, changes, is withdrawn, or ceases to support the required thresholds.
- Long-term tournament history is not a V1 requirement. Expired competitive payloads, normalized event/deck details, and superseded publication contents are eligible for bounded retention cleanup, targeted daily, subject to source requirements.
- Evidence remains append-only during its retained lifetime; corrections create revisions. Retention deletion is a separately governed, source-aware lifecycle operation with a bounded plan and recorded outcome, not silent evidence editing.
- Retention cleanup must preserve active-window evidence and must not orphan a current publication. A required source deletion invalidates dependent outputs before or with deletion.
- Minimal non-personal operational receipts, hashes, contract/policy versions, source permissions, current legality evidence, and reviewed equivalence provenance are distinct from a historical tournament archive. Preserve them as required by their governing contracts. Do not claim full replay of source payloads after those payloads are lawfully purged.

### 4. Event and deck validity

- Deduplicate events across sources and revisions. Reposting the same result must not increase its support.
- Identify completed events, scope, format/ruleset, event date, event size when known, online/in-person status, and the population actually published.
- Validate deck sections, quantities, list completeness, source card coordinates, and applicable deck construction. Keep uncertain evidence in review.
- Missing decklists are unknown, not decks that omitted a card. Unresolved card lines are unknown, not evidence of absence.
- An excerpt, winner-only list, top-cut list, or voluntary submission must retain that population label. It cannot establish full-field usage or win rates.
- Record event/deck counts, available-list coverage, mapping coverage, exclusions, and reasons. Unknown denominators remain unknown.
- Count each gameplay identity at most once for deck-inclusion support; sum its quantities across verified equivalent printings within that deck. Expanding a gameplay identity to multiple artworks must not multiply event or deck support.

Implementation candidate, 2026-11-16: a separate versioned policy may evaluate individually verified card lines from a complete published 60-card list while holding unresolved lines. Such output must explicitly disclose that whole-deck legality remains unverified, retain whole-list and line coverage separately, and label quantities as verified-line counts. Each contributing line still requires reviewed exact identity, gameplay linkage and event-time legality; positive output also requires current exact-print eligibility. Known construction violations or known event-ineligible cards reject the list. Held or ambiguous linked members must not supply group support. This candidate is not approval of thresholds, actual sources, review decisions or public release; public calibration must explicitly review partial coverage. Existing whole-deck policies remain separate.

### 5. Canonical identity and gameplay equivalence

- `card_prints.id` remains the canonical card anchor; the existing active identity subsystem retains printed-identity authority.
- GV-ID identifies canonical card identity. GVVI identifies an owned instance. Neither is replaced by a gameplay-group key.
- The engine may read existing active source mappings. It must not create, deactivate, or rewrite canonical mappings to make a competitive match succeed. Engine-specific aliases and links belong in separately governed non-canonical metadata with provenance.
- A gameplay-equivalence link records its canonical member, current identity reference/hash where available, evidence, review decision, version, and validity.
- Names, species, identical artwork, rarity, price, or approximate text similarity alone cannot establish equivalence.
- Verified functional equivalence and applicable official reprint/errata rules determine whether a common, full art, alternate illustration, stamped version, or reprint shares the competitive signal.
- Legality/physical eligibility must still be checked for the exact member. Excluded replica, oversized, non-tournament, wrong-domain, or otherwise ineligible versions cannot inherit a positive playable status.
- Drift or ambiguity in a member's identity invalidates its published link until reverified. Matching never changes canonical names, numbers, variants, finishes, or identity hashes.

### 6. Independent legality

- A tournament appearance does not establish current legality.
- Maintain source-backed, independently reviewed legality and printing-eligibility evidence with format, regional ruleset, effective dates, verification time, and evidence references.
- Include release eligibility, rotation, bans, applicable reprint/errata exceptions, and exact-print eligibility. A regulation mark alone is not a complete legality engine.
- Unknown, conflicting, expired, or insufficiently verified legality prevents a positive publication.
- A new ban, rotation, ruleset change, or invalidated eligibility decision must suppress affected results when effective, even if their competitive evidence is less than 30 days old. Historical event validity and current eligibility are distinct checks.

### 7. Deterministic qualification

`Playable` means current competitive qualification plus current exact-print eligibility. It does not mean merely legal, valuable, recommended to buy, or guaranteed to win.

Before any public publication, a checked-in versioned qualification policy must define:

- qualifying sources, events, populations, formats, rulesets, and evidence strengths;
- minimum independent event/deck support, treatment of top-cut results, and minimum overall coverage;
- treatment of submitted, partial, missing, and unresolved lists;
- legality freshness, publication freshness, expiry, and invalidation rules;
- reviewed equivalence requirements and the deterministic reason codes for each outcome.

The numeric thresholds are not selected by this contract. They must be justified against an inspected current sample, reviewed, pinned, and tested before the engine is accepted. A single appearance can establish observed use without automatically establishing current meta qualification. Manual seeds do not bypass the policy.

The same retained evidence, review decisions, policy version, ruleset, and `as_of` must produce the same qualification. No AI model may be the authority for card identity, legality, equivalence, or qualification.

Internal outcomes must distinguish qualified, insufficient evidence, review required, and out of scope. Missing or nonqualifying evidence is not a claim that the card is bad or never played.

### 8. Publication and consumer boundary

- Publish precomputed competitive results from backend workers. Edge handlers and clients remain thin; use the shared backend client and existing secret boundaries.
- Keep competition evidence and derived results separate from canonical card truth, Vault ownership, and governed pricing truth. No canonical `playable` boolean is authorized.
- A publication is complete and versioned, with publication/run ID, policy version, ruleset, evaluation time, window bounds, coverage, source attribution, freshness/expiry bounds, and deterministic explanations.
- Per-member output includes canonical card reference, verified gameplay-group link, qualification/eligibility outcome, supporting evidence references, and validity bounds. Source-level details remain labeled at their true scope.
- All active support needed to reproduce an in-window decision must remain traceable. Publication is atomic: partial or failed batches do not replace a complete snapshot.
- Distinguish a successful empty result from insufficient coverage, stale evidence, and engine unavailability. Never translate a failed acquisition into a successful claim that there are no playables.
- A last successful snapshot may be used only while it remains valid under its evidence, legality, and freshness policy. Cache lifetime must not exceed those validity bounds. Revocation must invalidate affected cached results; stale positives must not survive through a cache or client fallback.
- Late corrections and source withdrawals must be able to revoke a result and republish without duplicating support.

### 9. Later resolver and highlight obligations

These are consumer requirements, not authority to implement consumers before the engine is accepted:

- `playable` and `playables` compile into an explicit typed filter over the published engine output. Show the interpreted format and current window.
- Compose with card name, set, rarity, artwork, finish, and supported ownership filters. Apply required predicates before result limits and preserve them across routing and fallback paths.
- `common playables` uses exact normalized Common rarity; it must not match Uncommon by substring.
- `full art playables` uses verified artwork classification. It does not infer full-art status from price, a gameplay-group membership, or an assumed rarity equivalence.
- In `standard playables`, Standard is format intent, not the Normal/non-holo finish.
- Matching versions remain distinct catalog results under existing parent/child presentation rules. Shared gameplay support does not merge physical identities or assert that a specific artwork appeared in an event.
- Highlights communicate current competitive qualification and format, with evidence scope and freshness available on inspection. No highlight is a purchase recommendation.
- Web and native consume the same qualification. A consumer failure must not silently broaden a playable search or show an expired badge.
- Search performs no provider acquisition, competitive writes, arbitrary SQL generation, or AI calls during normal execution.
- Before consumer implementation, extend search's allowed filter/interface surface through the existing versioned contract process. This contract does not silently rewrite `GROOKAI_SMART_SEARCH_V1` or its V1 scope.
- Future visuals follow the active [Visual System](APP_VISUAL_SYSTEM_CONTRACT_V1.md), [Brand and Typography](BRAND_TYPOGRAPHY_CONTRACT_V1.md), and [Seasonal Brand System](SEASONAL_BRAND_SYSTEM_CONTRACT_V1.md), including Roboto and active Winter accent bindings.

## Allowed Behavior

- Contract-only planning now; subsequent read-only source and environment audits under existing gates.
- A bounded shadow engine with reviewed imports and limited disclosed coverage.
- Deterministic source adapters, review queues, legality/equivalence evidence, publication candidates, and failure persistence through separately approved implementation packages.
- Daily refresh and controlled retention cleanup once their implementations are separately authorized and verified.
- Adding future games, formats, deeper analytics, or longer retention through explicit versioned scope changes.

## Forbidden Behavior

- Shipping a resolver alias or card badge as a substitute for building the engine.
- Hardcoded client-side playable lists or a reviewer-authored positive flag without qualified source evidence.
- Direct provider-to-canon writes, identity changes, printing creation, ownership mutation, or pricing changes by this engine.
- Unapproved scraping, bypassing access controls, unsupported source reuse, or assuming attribution alone grants permission.
- Name-only equivalence, rarity-biased qualification, invented legality, duplicate event support, or treating missing evidence as zero usage.
- Publishing unexplained classifications, unpinned thresholds, unverified matches, mixed rulesets, partial snapshots, or stale positives.
- Calling competitive usage market demand or blending it into price truth.
- Building a required long-term tournament/player archive into V1.

## Verification and Engine Acceptance Gate

Before engine implementation, perform the Rulebook's applicable target/environment sanity checks. Before schema work or remote apply, complete the strict migration workflow. No live schema or data verification is replaced by this documentation review.

The engine must pass the Production Readiness Gate and produce stored verification artifacts for:

1. Source admission, preserved raw receipts, hashes, attribution, and retention/deletion behavior.
2. A successful acquisition, persisted failure, retry, and idempotent rerun.
3. Cross-source event deduplication and corrected/withdrawn decklist handling without double counting.
4. Missing lists, unresolved lines, partial populations, and insufficient overall coverage.
5. A source-backed regular/common member and a verified full-art equivalent qualifying together, without multiplying gameplay support.
6. A same-name card with different gameplay, an ambiguous link, an ineligible replica, and canonical identity drift failing closed.
7. Independent legality, reprint exceptions, ruleset separation, and effective ban/rotation invalidation.
8. The exact 30-day boundary, late-arriving old results, failed refresh, cache expiry, and suppression without a successful cleanup run.
9. Deterministic classification under pinned inputs, policy, ruleset, and `as_of`.
10. Atomic publication, failed-publication preservation, rollback/revocation, and independent readback of the published output.
11. Private evidence access, permitted public fields, canonical/ownership/pricing non-mutation, and bounded retention cleanup that preserves current dependencies.

Acceptance requires a checked-in engine checkpoint identifying the implemented artifacts, admitted sources, approved policy and thresholds, inspected target and exact readback, coverage/limitations, observability, and replay/rollback evidence. Only then may resolver and highlight implementation begin as the next phase.

Consumer verification must subsequently include the mixed query examples above, exact Common handling, strict filtering before limits, web/native agreement, interpretation labels, and failure behavior that preserves the requested filter.

## Decisions Required Before Engine Publication

- Exact admitted initial sources and their acquisition/use permissions.
- Exact regional/format ruleset and compatible event populations.
- Qualification thresholds and overall coverage floor supported by the inspected sample.
- Legality and publication freshness limits, invalidation mechanisms, and retention execution details.
- Audited schema/storage/read interfaces, worker execution packages, and the first reviewed equivalence cohort.

These are publication prerequisites, not claims that the engine exists. An API-independent architecture does not guarantee data availability. Initial coverage may remain limited and honestly labeled.

## Related Artifacts

- [Contract Index](../CONTRACT_INDEX.md)
- [Documentation System](DOCUMENTATION_SYSTEM_V1.md)
- Existing code touchpoints for later audits: `backend/catalog/pokemon_gameplay_details_read_v1.mjs`, `apps/web/src/lib/search/smartSearchIntent.ts`, `apps/web/src/lib/resolver/resolveQuery.ts`, `apps/web/src/app/api/resolver/search/route.ts`, `apps/web/src/lib/explore/getExploreRows.ts`, and `lib/models/card_print.dart`.
- Physical schema, source adapters, qualification policy, fixtures, and engine acceptance checkpoint remain future implementation artifacts.
