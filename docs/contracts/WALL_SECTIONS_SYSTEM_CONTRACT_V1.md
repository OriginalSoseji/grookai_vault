# WALL_SECTIONS_SYSTEM_CONTRACT_V1

**Status:** ACTIVE  
**Type:** Product + Data + Sharing + Entitlement Contract  
**Scope:** Governs public collector surfaces, custom sections, sharing, limits, and future vendor scalability in Grookai Vault

---

## 1. PURPOSE

This contract defines the correct long-term structure for how collectors present and share their cards publicly in Grookai Vault.

It replaces legacy overlapping public-presentation concepts such as:

- Collection
- Visible
- manually curated public buckets that do not distinguish presentation from interaction

with one unified public presentation system built around:

- a single universal Wall
- user-created Custom Sections
- shareable curated views
- entitlement-governed active usage
- storage capacity that can scale to collector and vendor needs without schema redesign

The system must feel natural to collectors, support curation and identity, scale to vendor-level organization, and remain aligned with Grookai's identity-first and interaction-first architecture.

The Wall and Custom Section system is not a marketplace rewrite, not a replacement for canonical cards, not a replacement for instance-level intent, and not a replacement for ownership truth.

---

## 2. CORE PRINCIPLE

Grookai public presentation is collector-curated, card-first, and interaction-driven.

This means:

- users control how their public cards are grouped
- cards and owned card instances remain the primary units
- sections are curated presentation views, not system-imposed identity categories
- interaction intent remains separate from presentation membership
- public visibility must be explainable from explicit rules, not hidden UI state

The Wall answers: "What is this collector publicly showing?"

A Custom Section answers: "How did this collector choose to present these cards together?"

Neither Wall nor Custom Sections may weaken canonical identity, ownership identity, or instance-level interaction authority.

---

## 3. PUBLIC SURFACE MODEL

Every user has one public presentation surface composed of the Wall plus zero or more active Custom Sections.

### 3.1 Wall (Required)

The Wall is:

- the default public surface
- always present for every user account
- not removable
- not renameable
- always ordered first in profile navigation
- the canonical public view of a collector
- the replacement for legacy "Visible" semantics

The Wall is system-driven. It is not a user-created section and is not stored as a normal Custom Section.

The Wall may be empty when the collector has no public cards. An empty Wall does not mean the user lacks a Wall.

### 3.2 Custom Sections (Optional)

Custom Sections are:

- user-created curated groups
- durable objects owned by the user
- placed alongside Wall in the public profile surface
- individually shareable when public and active
- named and ordered by the user
- allowed to contain cards regardless of whether the card is also visible on Wall, subject to visibility rules in this contract

Examples of valid Custom Section names include:

- FS/FT
- Pikachu
- Grails
- Vintage
- Favorites
- New Pickups
- Slabs
- Trade Binder
- Sale Binder

A Custom Section is a presentation object. It is not a card identity, not an ownership object, not an intent object, and not a price/listing object.

---

## 4. DATA CAPACITY MODEL

The storage model must support 20 Custom Sections per user.

This is the hard storage limit for user-created Custom Sections. It is not the default UI exposure count and it is not the free-tier active count.

The 20-section storage limit exists so that:

- vendor use cases are supported from the first schema shape
- collectors can grow into richer organization without migration churn
- entitlement can control active usage without deleting user organization
- inactive sections can be preserved safely during plan changes
- future UI can expose more organization without changing the core model

The Wall does not count against the 20 Custom Section storage limit.

If a user reaches 20 Custom Sections, the system must reject creation of additional Custom Sections until an existing Custom Section is deleted or otherwise removed from the stored set.

The storage limit must not be enforced by UI alone. Server-side write paths must enforce it.

---

## 5. ENTITLEMENT MODEL

Entitlement controls how many Custom Sections may be active at one time.

Entitlement tiers are:

| Tier | Active Custom Sections |
| --- | --- |
| Free | 3 |
| Pro | 10 |
| Vendor | 20 |

Important rules:

- entitlement controls active usage, not storage
- sections beyond entitlement may exist but must remain inactive
- inactive sections must not appear in public profile navigation
- inactive sections must not be shareable as live public section pages
- downgrading entitlement must not delete sections
- upgrading entitlement may allow stored inactive sections to become active
- Wall is always active and does not count toward entitlement

If a user downgrades below the number of currently active Custom Sections, the system must preserve the section records and deterministically mark only the allowed number active. The retained active set must be selected by stable user ordering unless a product-specific downgrade review flow is explicitly contracted later.

No UI or API may imply that inactive sections are public.

---

## 6. UI ACTIVATION MODEL

The UI must remain clean even though storage supports 20 Custom Sections.

V1 UI constraints:

- Wall must always be shown first
- only 3 to 5 sections should be shown prominently by default
- section navigation should use a horizontal carousel, chip row, segmented surface, or equivalent low-noise pattern
- overflow sections must be handled by a More surface, edit mode, or future expansion UI
- the UI must not expose all 20 sections as a large static tab bar
- empty or inactive sections must not create visual clutter

The product may show fewer than the user's active section entitlement when that is the cleaner UI choice. Entitlement defines maximum active capacity, not a requirement to fill the screen.

Custom Section management UI may expose all stored sections, including inactive sections, because management is not the same as public navigation.

Public browsing UI must prioritize clarity over raw section count.

---

## 7. SECTION IDENTITY MODEL

Each Custom Section is a durable object with stable identity.

Required section identity fields:

- `section_id`
- `user_id`
- `name`
- `position`
- `is_active`
- `is_public`
- `created_at`
- `updated_at`

Recommended future-proof fields that may exist from the first schema shape:

- `description`
- `cover_vault_item_instance_id`
- `slug`
- `visibility_state`
- `deleted_at`
- `archived_at`
- `source`
- `metadata`

The required identity fields are binding. Optional future-proof fields must not change the core section identity model.

Rules:

- `section_id` is stable and must not change when a section is renamed
- `user_id` defines ownership of the section
- `name` is user-facing copy and may change
- `position` defines owner-controlled ordering among Custom Sections
- `is_active` controls entitlement-visible usage
- `is_public` controls whether the section can appear publicly or be shared
- creation and update timestamps exist for ordering, auditability, and future management UX

A section is not a filter. It is a persistent entity.

Section name is not identity authority. Route resolution must not depend on a mutable name.

---

## 8. MEMBERSHIP MODEL

Cards belong to Custom Sections through a join model.

The membership model is instance-based.

### `section_memberships`

Required membership fields:

- `section_id`
- `vault_item_instance_id`
- `created_at`

Recommended future-proof fields:

- `position`
- `added_by_user_id`
- `note`
- `removed_at`
- `metadata`

Rules:

- membership is per `vault_item_instances` row, not grouped card
- membership must use the exact owned copy identity, also represented publicly by GVVI when visible
- a single vault item instance may belong to multiple Custom Sections
- multiple copies of the same canonical card may belong to different sections independently
- section membership does not affect canonical ownership
- section membership does not affect card identity
- section membership does not affect intent
- section membership does not create pricing or listing authority
- removing a card from one section must not remove it from another section
- deleting or archiving a section must not delete owned card instances

Grouped-only section membership is prohibited.

The correct unit is the exact owned instance because Grookai's public interaction, ownership, and contact systems are instance-aware.

---

## 9. WALL MEMBERSHIP RULE

Wall membership is system-driven.

The Wall contains all cards that are public according to Grookai visibility rules.

A card may appear on the Wall when it is public through one or more lawful signals:

- instance-level intent such as `trade`, `sell`, or `showcase`
- an explicit public visibility flag if such a flag is contracted and implemented
- another active public visibility rule explicitly governed by a future contract

Wall does not require manual section membership.

Wall does not store a normal `section_memberships` row for every visible card.

Wall is derived from public visibility. Custom Sections are curated by the user.

Rules:

- intent may make an instance eligible for Wall visibility
- a Custom Section may present an instance without replacing the intent signal
- private or non-public instances must not appear on Wall
- held cards must not appear on Wall unless another explicit public visibility rule allows it
- Wall must remain the first public profile surface even when empty

Wall replaces "Visible" as a product concept. "Visible" may exist only as compatibility language in legacy code or migration context, not as a new user-facing public surface.

---

## 10. SHARE MODEL

The sharing model has two lawful public share scopes:

### 10.1 Wall Share

A Wall share exposes the collector's default public view.

Canonical route:

```txt
/@username
```

Rules:

- Wall share must show the Wall first
- Wall share may include active public Custom Sections as navigation
- Wall share must not expose private or inactive sections
- Wall share must not expose private card instances

### 10.2 Section Share

A Section share exposes only the selected Custom Section.

Canonical route:

```txt
/@username/section/[section_id]
```

Rules:

- Section share must resolve by stable section identity
- Section share must require the section to belong to the username owner
- Section share must require the section to be active
- Section share must require the section to be public
- Section share must show only cards in that section that are lawful to display publicly
- Section share must not expose unrelated sections
- Section share must not expose hidden sections
- Section share must not expose private groupings
- Section share must not reveal inactive section names

Valid share examples:

- only FS/FT
- only Pikachu
- only Sale Binder
- only Grails

The presence of a share link does not create public visibility for cards that are otherwise private under this contract.

---

## 11. VISIBILITY MODEL

Custom Sections can be:

- public
- private
- inactive

Cards can be:

- visible via Wall
- visible via Custom Section
- visible via both Wall and Custom Section
- private and absent from public surfaces

Definitions:

- public section: active, public, and eligible for public route rendering
- private section: visible only to the owner in management UI
- inactive section: stored but not usable as a live public presentation surface
- Wall-visible card: an instance that satisfies the Wall membership rule
- section-visible card: an instance that belongs to a public active section and satisfies public display eligibility

Important rules:

- a private section must never be publicly routable
- an inactive section must never be publicly routable
- a public section must still filter out private or ineligible card instances
- hiding a section must not change the underlying instance intent
- changing instance intent must not delete Custom Section membership
- removing public visibility from an instance must remove it from public rendering even if it remains in a section

Public rendering must fail closed.

---

## 12. INTERACTION MODEL

Intent authority is instance-level.

The authoritative intent field is:

```txt
vault_item_instances.intent
```

Sections do not replace intent.

Instead:

- intent is the interaction signal
- section is the presentation layer

Examples:

- a card in "FS/FT" with intent `sell` may be contactable under sell rules
- a card in "FS/FT" with intent `trade` may be contactable under trade rules
- a card in "Pikachu" with intent `hold` may be curated but must not imply availability unless a separate public visibility rule allows it
- a card in "Grails" with intent `showcase` may be publicly displayed without sale/trade framing

Rules:

- Custom Section membership must not imply contact eligibility
- Custom Section name must not imply contact eligibility
- contact eligibility must derive from instance-level intent or another explicit interaction contract
- a "Sale Binder" section cannot make a `hold` card sellable by name alone
- a "Trade Binder" section cannot make a private card tradeable by name alone
- interaction CTAs must follow the Card Interaction and intent contracts, not section labels

Section curation may provide context. It must not create authority.

---

## 13. ROUTING MODEL

Route identities must remain separated.

Canonical card route:

```txt
/card/[gv_id]
```

Exact copy route:

```txt
/gvvi/[gvvi_id]
```

Wall route:

```txt
/@username
```

Section route:

```txt
/@username/section/[section_id]
```

Rules:

- `/card/[gv_id]` must resolve only canonical card identity
- `/gvvi/[gvvi_id]` must resolve exact owned copy identity
- `/@username` must resolve public collector Wall identity
- `/@username/section/[section_id]` must resolve Custom Section identity
- section routes must not use mutable section names as authority
- section routes must not impersonate canonical card or GVVI routes
- deleted, inactive, private, or cross-owner section routes must fail closed

Current legacy routes may exist as compatibility routes, but new Wall and Custom Section work must follow this routing model unless this contract is explicitly versioned.

---

## 14. UI MODEL

The top-level public profile navigation model is:

```txt
Wall | Section 1 | Section 2 | Section 3 | ...
```

Rules:

- Wall is always first
- active public Custom Sections follow Wall
- section order follows owner-defined `position`
- navigation must remain calm and low-noise
- swipeable, carousel, or chip-based navigation is allowed
- section labels must be minimal
- public UI must not show inactive sections
- public UI must not expose private section names
- section management UI may show active, inactive, public, and private state to the owner

UI must avoid:

- large permanent 20-tab strips
- dashboard-heavy controls on public surfaces
- duplicate Wall/Visible labels
- badges that make Custom Sections look like marketplace listings
- controls that imply private cards are publicly actionable

Owner management UI must clearly distinguish:

- active vs inactive
- public vs private
- section membership vs intent
- Wall visibility vs Custom Section membership

Public viewer UI must remain simpler than owner management UI.

---

## 15. IMAGE MODEL

All Wall and Custom Section card surfaces must use the product display image contract.

The primary image field is:

```txt
display_image_url
```

Resolution order:

```txt
display_image_url -> image_url -> image_alt_url -> representative_image_url -> null
```

Rules:

- exact images and representative images are valid product images when surfaced through the display image contract
- representative images must not be treated as missing
- placeholders must appear only when no safe display image exists
- broken image icons must not appear in final UI
- private storage paths must not be exposed
- signed or tokenized URLs must not leak unless explicitly allowed by the canonical image contract for that surface
- provisional image safety remains separate and stricter

Custom Sections must not introduce a separate image contract.

Wall, Section, GVVI, and public collector surfaces must render the same image for the same card instance when they consume the same public read model.

---

## 16. PROVISIONAL INTERACTION RULE

Provisional cards remain non-canonical.

Provisional cards may appear in Wall or Custom Section surfaces only if a separate product rule explicitly allows provisional public presentation in that surface.

If provisional cards are allowed in a Wall or Custom Section surface, they must:

- remain visually and structurally separated from canonical cards
- use provisional identity only
- use public-safe provisional image rules
- show approved provisional labels such as `Unconfirmed` or `Under Review`
- route only through provisional route boundaries
- fail closed when unsafe or ineligible

Provisional cards must never:

- show a GV-ID
- show canonical ownership
- show pricing
- show provenance
- enter vault ownership flows
- be treated as canonical card truth
- use `/card/[gv_id]`
- use `/gvvi/[gvvi_id]`
- imply that section membership canonizes the card

Section membership cannot promote provisional cards into canon.

Promotion continuity, if applicable, must follow the explicit provisional-to-canonical continuity contract and may not infer canonical identity from section membership.

---

## 17. FORBIDDEN BEHAVIORS

The following behaviors are prohibited:

- reintroducing a Collection/Visible split as the primary public model
- treating Wall as a removable or renameable Custom Section
- allowing unlimited visible sections in public UI
- using grouped card membership instead of instance-level membership
- making section membership affect canonical ownership
- making section membership affect canonical identity
- making section membership affect instance-level intent
- making section name create sale, trade, or contact eligibility
- tying section count to schema shape instead of entitlement state
- deleting stored sections on entitlement downgrade
- exposing private sections in share links
- exposing inactive sections in public navigation
- using mutable section names as route authority
- mixing canonical and provisional identities in one undifferentiated section model
- allowing section share pages to reveal unrelated sections
- rendering private instances only because they belong to a public section
- using legacy `vault_items.intent`, `shared_cards.share_intent`, or grouped intent as Wall or section authority
- treating Custom Sections as price lists or marketplace listings without a separate marketplace contract

If a future feature requires one of these behaviors, this contract must be versioned before implementation.

---

## 18. RESULT

This system provides:

- a clean public profile model
- a universal Wall for every collector
- durable user-created Custom Sections
- instance-level curation
- shareable section views
- entitlement-governed active usage
- storage capacity for vendor-scale organization
- strict separation between presentation and interaction
- strict separation between canonical, GVVI, Wall, Section, and provisional routes
- no dependency on legacy Collection/Visible language
- no required schema redesign when Pro or Vendor section capacity is enabled

The result is a public presentation layer that lets collectors express identity while preserving Grookai's card truth, ownership truth, and interaction truth.

---

## 19. LOCK

All future Wall and Custom Section work must comply with this contract.

The following rules are locked:

- Wall is the universal default public surface
- Wall is system-driven
- Custom Sections are durable user-created presentation objects
- Custom Section membership is instance-level
- entitlement controls active Custom Section usage
- storage supports 20 Custom Sections per user
- Wall, Section, Card, GVVI, and Provisional routes remain separated
- sections do not replace instance-level intent
- sections do not create canonical, ownership, pricing, provenance, sale, trade, or contact authority

If any future feature conflicts with this contract, implementation must stop and the contract must be audited and versioned first.
