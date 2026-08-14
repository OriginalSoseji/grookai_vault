# Cross-TCG Sealed Product Domain V1

## Purpose

Define the proposed canonical data domain for manufacturer sealed TCG products.
This contract is a design gate. It does not authorize a migration apply, source
promotion, pricing qualification, release activation, or client read.

The source evidence is the final Cross-TCG Sealed Catalog Readiness V1 audit:

- producer SHA: `c2337c94b63f87700a4efc8e1b8e114653659609`;
- logical sample SHA-256:
  `1d788df0260d598ad2e99496989361af9edb68f1538ff88e5455b802e278a948`;
- active source products classified: `499872`;
- sealed candidates: `10007`;
- ambiguous review rows: `9836`.

## Absolute Boundary

Sealed identity is a separate product domain. No sealed table references,
inserts into, updates, deletes from, or derives authority from `card_prints` or
`card_printings`. An individual card remains card-domain identity even when it
was distributed inside a sealed product.

```text
TCGCSV source product
  -> service-only candidate staging
  -> append-only human review evidence
  -> immutable sealed family
  -> immutable sealed variant
  -> exact source mapping
  -> exact pricing-lane qualification
  -> immutable release membership
  -> governed release pointer
```

No stage may skip the preceding authority boundary.

## Identity Model

### Family

A family represents the stable manufacturer product concept across variants.
Its identity includes:

- `game_key`;
- manufacturer;
- canonical family name;
- product-line/set key when supported;
- family identity version;
- deterministic identity fingerprint.

Changing any identity-bearing value creates a new family. Identity-bearing
columns are immutable after insertion.

### Variant

A variant represents one exact purchasable sealed configuration. Its identity
includes:

- family;
- package form;
- language and region;
- edition and wave;
- explicit quantity/content specification;
- manufacturer SKU or UPC when available;
- deterministic variant fingerprint.

Package forms are limited to:

- `pack`;
- `sleeved_pack`;
- `booster_box`;
- `display`;
- `case`;
- `deck`;
- `deck_display`;
- `kit`;
- `tin`;
- `collection`;
- `bundle`;
- `promo_pack`.

An unknown language, region, edition, wave, quantity, or release date remains
null. Unknown does not inherit from a sibling variant.

### Identity evidence

Every nontrivial variant dimension has append-only evidence containing:

- evidence dimension;
- source provider and source object identity;
- source field and exact source value;
- normalized value;
- evidence strength and confidence;
- source payload hash;
- evidence timestamp.

Permitted dimensions are `product_line`, `manufacturer`, `package_form`,
`language`, `region`, `edition`, `wave`, `quantity`, `contents`, `release_date`,
and `presale_state`.

## Source Mapping

`sealed_product_source_mappings` owns exact source identity. For TCGPlayer, the
tuple `(source_provider, source_category_id, source_group_id,
source_product_id)` is unique and maps to exactly one sealed variant.

A mapping requires:

- image-independent source identity;
- reviewed exact variant ownership;
- source product name and payload hash;
- classifier and mapping contract versions;
- exact-review authority.

Name matching alone cannot create an exact mapping. Mappings are immutable and
each TCGPlayer source tuple has one owner. Correcting a wrong mapping requires
an explicit later corrective migration and audit; it cannot be silently
repointed or superseded by an ordinary insert.

## Candidate And Review Boundary

`sealed_product_candidates` is service-only staging. It may preserve
`sealed_candidate`, `ambiguous_review`, `nonsealed_card`, and
`excluded_non_tcg_product` classifier outcomes, but only `sealed_candidate`
may enter promotion review.

Candidate rows default to:

- `requires_review = true`;
- `promotion_eligible = false`;
- no canonical authority;
- no publication authority.

`sealed_product_candidate_reviews` is append-only. A single review does not
mutate source evidence. Promotion requires a current `confirmed_sealed` review,
exact source mapping evidence, no unresolved conflict, and all identity fields
needed by that variant.

Ambiguous rows remain staging rows. They cannot become family, variant, source
mapping, pricing, release, or app-visible rows through automated inference.

## Exact Pricing-Lane Hook

`sealed_product_pricing_lane_qualifications` links one exact source mapping to
one exact TCGCSV price-row identity and observation date. It stores no published
price and grants no publication authority.

Qualification statuses are:

- `pending`;
- `qualified_exact`;
- `blocked_ambiguous`;
- `blocked_missing_price`;
- `blocked_stale`;
- `blocked_currency`;
- `blocked_source_inactive`.

`qualified_exact` requires exact variant ownership, exact source subtype,
supported currency, freshness evidence, and a source observation fingerprint.
The hook does not write any existing pricing or market-evidence table.

## Release Control

A sealed release is an immutable membership manifest plus a mutable singleton
pointer. The no-publication canary creates only a `draft` manifest. Because
release rows are immutable, freezing creates a separately audited `frozen`
manifest rather than updating a draft row. Membership may only contain reviewed
exact variants and exact source mappings. Activation is a later explicit gate.

Members may be inserted only while a release is `draft`. A service-only freeze
function checks the expected manifest fingerprint and exact member count before
performing the only permitted release-row transition from `draft` to `frozen`.
After that transition, both the manifest and membership are immutable.

The service-only pointer function requires a frozen target, reconciles the
manifest's expected member count, locks the pointer table, and requires the
caller's expected current release to match. Direct pointer mutation is not
granted to `service_role`. Activation and restoration therefore use one atomic
compare-and-swap boundary, including when the singleton pointer does not yet
exist.

The V1 migration candidate creates no app-facing view or RPC. Its only callable
control is the service-only release-pointer function. `anon` and `authenticated`
receive no table or function privileges. A release pointer does not itself
authorize a client read surface.

Rollback of a release means atomically restoring the previous pointer. It does
not mutate identity or source mapping rows.

## Security

All proposed tables:

- enable and force RLS;
- revoke all privileges from `public`, `anon`, `authenticated`, and
  `service_role` before applying the exact service-role grants;
- grant only the minimum table privileges to `service_role`;
- have service-role-only policies;
- expose no public view, materialized view, or RPC in this gate.

Identity and review records are not writable by signed-in users.

## Migration And Rollback

The migration candidate is an unapplied file under `docs/sql`. It is one atomic
transaction. A separate reverse-order rollback candidate is provided only for
an approved schema-only apply before canonical data exists.

After any canonical data exists, rollback must preserve data and use release
pointer restoration. Dropping populated tables is never an operational
rollback.

## Invariants

- Sealed identity never uses the card-print domain.
- Family and variant identity fields are immutable.
- Exact source ownership is one source product to one variant.
- Candidate staging never grants canonical authority.
- Ambiguity never promotes automatically.
- Evidence is append-only and traceable.
- Pricing hooks store qualification, not publication truth.
- Releases are service-only and default to draft.
- No app visibility exists until a later read-contract gate.

## Exact Next Gate

Review and explicitly approve the unapplied migration fingerprint. Then apply
the schema alone in one transaction, perform schema/RLS/grant readback, and
stop. Only after that proof may a separately approved small hidden
no-publication canary be planned.
