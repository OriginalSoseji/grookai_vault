# PUBLIC_PROVISIONAL_WAREHOUSE_CARD_CONTRACT_V1

**Status:** ACTIVE  
**Type:** Product + Read-Layer Contract  
**Scope:** Governs public exposure of safe provisional warehouse candidates in Grookai Vault

---

## 1. PURPOSE

This contract defines the only lawful way to expose a public-facing provisional card surface from the Canon Warehouse.

Canonical `card_prints` remain the only public truth cards. The warehouse remains an evidence and staging system, not a source of canonical truth. A limited subset of warehouse candidates may be surfaced publicly as provisional cards when the row carries enough public-safe identity to be displayed honestly without implying canonization.

A public provisional warehouse card exists for honesty and discovery. It allows Grookai to say that a card-like candidate is known to the system and under review without claiming that the candidate belongs to the canonical catalog.

A provisional warehouse card is not a canonical card.

---

## 2. CORE PRINCIPLE

Canonical cards are truth.

Public provisional cards are visible candidates.

Visibility does not imply canonization.

A provisional warehouse card must never impersonate a canonical card. It must never be presented as confirmed, owned by the canonical catalog, eligible for canonical actions, or equivalent to a `card_prints` row.

---

## 3. DOMAIN BOUNDARY

### 3.1 Canonical Card Domain

The Canonical Card Domain is sourced from `card_prints`.

A canonical card:

- has a GV-ID
- is routable through `/card/[gv_id]`
- may participate in public truth surfaces
- may participate in vault flows
- may participate in pricing flows
- may participate in provenance flows
- may participate in ownership flows
- may carry canonical image and identity truth badges

Only canonical cards may be treated as public truth cards.

### 3.2 Public Provisional Warehouse Domain

The Public Provisional Warehouse Domain is sourced only from whitelisted warehouse candidates.

A public provisional warehouse card:

- has no GV-ID
- is not canonical
- is not routable through canonical card routes
- is not eligible for vault flows
- is not eligible for pricing flows
- is not eligible for provenance flows
- is not eligible for ownership flows
- is not eligible for canonical trust treatments

The Public Provisional Warehouse Domain is a visible non-canonical domain. It may expose uncertainty. It may not define truth.

---

## 4. ELIGIBLE SOURCE SUBSET

A warehouse candidate is eligible for public provisional exposure only when every requirement in this section is satisfied.

The candidate must satisfy all inclusion requirements:

- `submission_intent = MISSING_CARD`
- `state` is one of:
  - `RAW`
  - `NORMALIZED`
  - `CLASSIFIED`
  - `REVIEW_READY`
- `promoted_card_print_id IS NULL`
- the candidate is source-backed
- `reference_hints_payload.bridge_source = external_discovery_bridge_v1`
- a safe display identity can be derived from `claimed_identity_payload` or `reference_hints_payload`
- the safe display identity includes:
  - display name
  - set hint or effective set code
  - printed number or normalized number hint
- the row does not require private evidence to become displayable
- the row does not require raw notes to become displayable
- the row does not require founder-only event metadata to become displayable

The candidate is ineligible when any exclusion condition is true:

- `submission_intent = MISSING_IMAGE`
- `state` is one of:
  - `APPROVED_BY_FOUNDER`
  - `STAGED_FOR_PROMOTION`
  - `PROMOTED`
  - `REJECTED`
  - `ARCHIVED`
- `promoted_card_print_id IS NOT NULL`
- `proposed_action_type = ENRICH_CANON_IMAGE`
- `proposed_action_type = CREATE_CARD_PRINTING`
- `proposed_action_type = BLOCKED_NO_PROMOTION`
- `identity_audit_status = ALIAS`
- `identity_audit_status = SLOT_CONFLICT`
- `identity_audit_status = AMBIGUOUS`
- `identity_audit_status = PRINTING_ONLY`
- the row is image-only
- the row is alias-only
- the row is a slot conflict
- the row is blocked from promotion
- the row is ambiguous
- the row lacks a public-safe display identity

Rows outside this subset are not public provisional cards under V1.

---

## 5. PUBLIC IDENTITY MODEL

The warehouse `id` may be used as the public provisional identifier.

The provisional identifier is not a GV-ID. It carries no canonical authority. It must not be formatted, labeled, routed, displayed, indexed, or interpreted as a GV-ID.

No synthetic GV-ID, temporary GV-ID, placeholder GV-ID, GV-like slug, or future-GV-ID may be created for a provisional warehouse card.

An allowed route shape is:

- `/provisional/[candidate_id]`

The following route shapes are prohibited:

- `/card/[candidate_id]`
- `/card/[fake-gvid]`
- `/card/[warehouse-id]`
- any canonical card route carrying provisional identity

A provisional record must not use `/card/[gv_id]`.

---

## 6. PUBLIC FIELD WHITELIST

Public provisional exposure must use a bounded read model. It must not expose raw warehouse rows.

Only the following fields may appear in the public provisional read model.

| Field | Purpose | Source basis | Direct or derived |
| --- | --- | --- | --- |
| `candidate_id` | Stable provisional identifier. | `canon_warehouse_candidates.id` | Direct |
| `display_name` | Human-readable candidate name. | Whitelisted source-backed payload identity. | Derived |
| `set_hint` | Public set or effective set context. | Whitelisted source-backed payload set fields. | Derived |
| `number_hint` | Public printed number context. | Whitelisted source-backed payload number fields. | Derived |
| `image_url` | Optional public-safe image. | Already-public HTTP(S) image URL only. | Direct or omitted |
| `provisional_state` | Internal-safe normalized state value. | Eligible warehouse lifecycle state. | Derived |
| `provisional_label` | Public label such as `UNCONFIRMED` or `UNDER REVIEW`. | Public state mapping in this contract. | Derived |
| `public_explanation` | Short public honesty message. | Public explanation mapping in this contract. | Derived |
| `source_label` | Optional source label when already public-safe. | Sanitized approved source label only. | Derived or omitted |
| `created_at` | Optional recency context. | Candidate creation timestamp. | Direct, only if product surface needs recency |
| `updated_at` | Optional review freshness context. | Candidate update timestamp. | Direct, only if product surface needs freshness |

Fields not listed in this whitelist are forbidden by default.

---

## 7. FORBIDDEN PUBLIC FIELDS

The public provisional read model must not expose:

- GV-ID
- raw `notes`
- `submitted_by_user_id`
- `founder_approved_by_user_id`
- `founder_approved_at`
- `founder_approval_notes`
- `rejected_by_user_id`
- `rejected_at`
- `rejection_notes`
- `archived_by_user_id`
- `archived_at`
- `archive_notes`
- `current_staging_id`
- staging ids
- staging payloads
- staging execution status
- internal event payloads
- raw event metadata
- private storage paths
- signed URLs intended for founder review
- raw interpreter packages
- raw normalized packages
- raw classification packages
- raw internal reason codes unless mapped and sanitized
- contributor credits
- user identity data
- private evidence metadata
- founder review commentary
- any field that implies canonical approval
- any field that implies canonical identity
- any field that implies ownership, valuation, or provenance authority

A field not explicitly whitelisted is prohibited.

---

## 8. PUBLIC STATE MAPPING

V1 allows only the following public state mappings:

| Warehouse state | Public label | Public meaning |
| --- | --- | --- |
| `RAW` | `UNCONFIRMED` | The candidate has entered warehouse and is not canonical. |
| `NORMALIZED` | `UNDER REVIEW` | The candidate has been prepared for review and is not canonical. |
| `CLASSIFIED` | `UNDER REVIEW` | The candidate has interpreter output and is not canonical. |
| `REVIEW_READY` | `UNDER REVIEW` | The candidate is ready for human review and is not canonical. |

Rows in the following states are excluded from V1 provisional public exposure:

- `APPROVED_BY_FOUNDER`
- `STAGED_FOR_PROMOTION`
- `PROMOTED`
- `REJECTED`
- `ARCHIVED`

When a row becomes `PROMOTED`, it must leave the provisional surface. The canonical destination becomes the public source of truth.

---

## 9. PUBLIC EXPLANATION CONTRACT

Public explanations must be short, honest, and derived only from sanitized mappings.

Allowed explanation patterns include:

- `This card is not part of Grookai's canonical catalog yet.`
- `This card is visible as a provisional candidate while under review.`
- `This candidate is unconfirmed and may change before it becomes canonical.`
- `This candidate is separate from Grookai's canonical card catalog.`

Public explanations must not expose:

- raw worker text
- raw interpreter output
- raw internal reason codes
- founder-only review commentary
- internal queue mechanics
- staging mechanics
- private evidence details
- user submission notes
- approval status
- promotion execution status

A public explanation must never imply that canonization is guaranteed.

---

## 10. IMAGE SAFETY CONTRACT

Only already-public-safe image URLs may be exposed.

A public-safe image URL is an HTTP(S) URL already suitable for public display. Private evidence storage paths are not public-safe. Signed URLs generated for founder review are not public-safe for this contract.

The public provisional surface must not expose:

- private storage paths
- bucket object paths
- signed founder-review previews
- user-uploaded evidence URLs unless separately approved as public-safe
- raw image metadata from warehouse evidence rows

Absence of a public-safe image must not block provisional visibility when the candidate otherwise satisfies the eligible source subset.

Placeholder rendering is acceptable when no public-safe image exists.

---

## 11. ROUTING CONTRACT

Public provisional warehouse cards may not use canonical card routes.

Canonical route usage is prohibited for provisional records:

- `/card/[gv_id]` is reserved for canonical `card_prints`
- `/card/[candidate_id]` is prohibited
- `/card/[fake-gvid]` is prohibited
- `/card/[warehouse-id]` is prohibited

A provisional detail route, if introduced, must use provisional candidate identity, not canonical card identity.

Allowed route example:

- `/provisional/[candidate_id]`

Search-only exposure is valid for V1. A detail route is not required for V1.

A provisional route must not inherit canonical card page actions, canonical truth badges, vault actions, pricing actions, provenance actions, or ownership actions.

---

## 12. UI CONTRACT

Public provisional cards must be visually and behaviorally distinct from canonical cards.

A public provisional card must show an approved public label:

- `UNCONFIRMED`
- `UNDER REVIEW`

The UI must make clear that the row is not part of the canonical catalog.

A public provisional card must not show:

- Add to Vault
- pricing
- ownership status
- provenance actions
- canonical truth badge
- canonical image truth badge
- canonical GV-ID
- canonical card route affordance
- collector ownership affordance
- any action implying the card is already resolved into canon

A public provisional card may show:

- display name
- set hint
- number hint
- public-safe image or placeholder
- public provisional label
- public explanation
- non-canonical route affordance when a separate provisional route exists

The UI must not reuse canonical card truth treatments for provisional rows.

---

## 13. PROMOTION TRANSITION RULE

When a provisional warehouse row becomes `PROMOTED`, the row ceases to be rendered as provisional.

After promotion:

- the canonical destination becomes the source of truth
- public routing must resolve to the canonical card page when a canonical destination exists
- the provisional identifier must not masquerade as canonical identity
- the provisional surface must not continue to present the row as under review
- any provisional search result must be removed or replaced by the canonical card result

Promotion does not retroactively make the provisional identifier a GV-ID.

---

## 14. FORBIDDEN BEHAVIORS

The following behaviors are prohibited:

- exposing warehouse wholesale
- exposing raw warehouse rows
- mixing provisional and canonical rows silently
- showing GV-ID on provisional rows
- creating fake GV-IDs for provisional rows
- routing provisional rows through `/card/[gv_id]`
- allowing provisional records into vault flows
- allowing provisional records into pricing flows
- allowing provisional records into provenance flows
- allowing provisional records into ownership flows
- reusing canonical card truth treatments for provisional rows
- showing canonical truth badges on provisional rows
- surfacing blocked rows as user-ready cards
- surfacing ambiguous rows as user-ready cards
- surfacing image-only rows as provisional cards
- surfacing alias-only rows as provisional cards
- surfacing slot-conflict rows as provisional cards
- surfacing rejected rows as provisional cards
- surfacing archived rows as provisional cards
- surfacing staged rows as provisional cards
- surfacing founder-approved rows as provisional cards
- leaking private evidence
- leaking founder-review data
- leaking user identifiers
- leaking raw notes
- leaking signed founder-review previews
- treating visibility as approval
- treating review readiness as canonization

---

## 15. MINIMUM SAFE V1 SURFACE

The minimum safe V1 surface is search-only exposure.

Search-only exposure may show eligible provisional candidates in a clearly separated section with approved public labels and no canonical actions.

A separate provisional detail page may be introduced later only if it complies with this contract.

Canonical card page integration is forbidden for V1 unless a later contract explicitly defines a safe integration boundary.

---

## 16. RESULT

This contract allows Grookai to show uncertainty without corrupting truth.

It guarantees that:

- canonical cards remain protected
- warehouse remains non-canonical
- provisional visibility remains honest
- public users can see limited candidate information without receiving false authority signals
- GV-ID remains reserved for canonical `card_prints`
- vault, pricing, provenance, and ownership flows remain canonical-only

Grookai may expose safe provisional candidates. Grookai may not convert visibility into truth.

---

## 17. LOCK

All future public provisional warehouse work must comply with `PUBLIC_PROVISIONAL_WAREHOUSE_CARD_CONTRACT_V1`.

Any implementation that exposes warehouse candidates publicly must enforce:

- the eligible source subset
- the public field whitelist
- the forbidden field list
- the public state mapping
- the image safety contract
- the separate routing boundary
- the UI boundary
- the promotion transition rule

If a future requirement conflicts with this contract, the work must stop until a successor contract is written and approved.
