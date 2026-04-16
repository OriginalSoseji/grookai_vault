# PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1

## PURPOSE

This rule exists for cases where two or more real cards share:

- the same set
- the same printed number
- the same printed name

but are still distinct canonical identities because they differ by rarity-tier /
illustration-category identity.

Example shape:

- Spewpa 089/088 (Illustration Rare)
- Spewpa 089/088 (Shiny Rare)

These are NOT duplicates.
These are NOT child printings.
These are separate canonical card identities.

## CANONICAL DECISION

When all of the following are true:

1. same candidate set
2. same printed number / number_plain
3. same normalized printed name
4. rows are proven to represent distinct real cards
5. the distinction is identity-bearing (illustration category / rarity tier), not finish-only

THEN:

- create separate canonical `card_prints` rows
- keep the base printed name unchanged
- separate identity with `variant_key`
- store the human-readable category in traits
- display the distinction in UI using presentation formatting, not by mutating canonical name

## IDENTITY MODEL

Canonical row identity remains:

- printed set
- printed number
- printed name
- variant_key

The distinguishing identity key for this collision class is:

- `variant_key`

Examples:

- `illustration_rare`
- `shiny_rare`

UI display label is derived, not stored as canonical name mutation.

## DISPLAY RULE

Canonical DB name remains:

- `Spewpa`

Display label becomes:

- `Spewpa 089/088 (Illustration Rare)`
- `Spewpa 089/088 (Shiny Rare)`

Formula:

`<name> <printed_number> (<illustration_category_label>)`

This is presentation only.

## HARD CLASSIFICATION RULE

These rows are:

- NOT duplicates
- NOT finish variants
- NOT child printings
- NOT aliases of one another

They ARE:

- separate canonical rows sharing the same printed name and printed number

Reason:
their market identity and collector identity differ in a way that affects:
- ownership
- search
- pricing
- display
- mapping
- vault behavior

## WHEN THIS RULE TRIGGERS

Trigger this rule when upstream evidence shows same-name same-number collisions,
and the distinguishing signal is one of the following:

- Illustration Rare vs Shiny Rare
- Illustration Rare vs Full Art
- Shiny Rare vs Full Art
- other future rarity-tier / illustration-category collisions

Only trigger when the difference is identity-bearing.

Do NOT trigger for:

- holo vs reverse holo
- cosmos holo vs holo
- stamped promo overlays that belong to child printing lanes under current model
- purely finish-level variations

## INTAKE DECISION TREE

For each collision group:

Step 1
Confirm:
- same set
- same number_plain
- same normalized name

Step 2
Audit the distinguishing evidence from source payloads:
- rarity labels
- category labels
- illustration-type text
- stable suffix evidence in source ids
- any supporting product/catalog metadata

Step 3
Classify the difference:

A. finish-only difference
-> child printing lane
-> STOP this rule

B. identity-bearing rarity/illustration difference
-> separate canonical rows
-> continue this rule

Step 4
Assign deterministic `variant_key` values.

Step 5
Create separate canonical candidates with:
- same base name
- same printed number
- different variant_key
- illustration/rarity trait attached

## VARIANT KEY RULE

`variant_key` must be deterministic, lowercase snake_case, source-independent.

Approved examples for this collision class:

- `illustration_rare`
- `shiny_rare`
- `special_illustration_rare`
- `full_art`
- `hyper_rare`
- `gold_rare`

Do NOT use:

- raw JustTCG external-id suffixes directly
- source-specific slugs
- unstable marketing phrases unless they normalize cleanly

Normalization principle:
source text may inform the key, but canonical `variant_key` must be Grookai-owned.

## TRAIT RULE

Store the user-facing category as a trait.

Preferred trait:
- `illustration_category`

Examples:
- `Illustration Rare`
- `Shiny Rare`

Trait is for:
- display
- filtering
- audit clarity

Trait is NOT the canonical uniqueness key.
`variant_key` remains the identity separator.

## UNIQUENESS RULE

For this collision class, canonical uniqueness becomes lawful through:

- same `set_id`
- same `number_plain`
- different `variant_key`

Therefore these rows must never both use empty/base `variant_key`.

Invalid:
- Spewpa 089/088 + `variant_key=''`
- Spewpa 089/088 + `variant_key=''`

Valid:
- Spewpa 089/088 + `variant_key='illustration_rare'`
- Spewpa 089/088 + `variant_key='shiny_rare'`

## SOURCE EVIDENCE RULE

Source-specific ids may be used as evidence, but not as canonical truth.

Example:
If JustTCG distinguishes rows via:
- `...illustration-rare`
- `...shiny-rare`

That evidence may justify the split, but the canonical model must be recorded using:
- Grookai `variant_key`
- Grookai trait values

Never make canonical identity dependent on external source slug shape.

## WAREHOUSE INTAKE RULE

For warehouse candidate intake:

If a collision group is found with same set + same number + same name,
and the evidence proves multiple real cards distinguished by illustration/rarity identity:

1. create separate warehouse candidates
2. attach proposed `variant_key`
3. attach proposed `illustration_category`
4. mark the group as collision-resolved-by-variant-key
5. require no fallback merge behavior

There must be no auto-collapse behavior for these groups.

## PROMOTION RULE

Promotion into canon is allowed only after:

- the collision group has been audited
- each row has deterministic `variant_key`
- each row has deterministic trait classification
- no row in the group remains unlabeled
- the group is proven not to be finish-only

Then each row becomes its own canonical `card_print`.

## SEARCH / UI RULE

Search should surface both rows separately.

Preferred display:
- `Spewpa 089/088 (Illustration Rare)`
- `Spewpa 089/088 (Shiny Rare)`

Search should not collapse them into one result.
Vault should not collapse them into one ownership target.
Pricing should not aggregate them together.

## ANTI-DRIFT RULE

The following are prohibited:

- collapsing same-name same-number identity-bearing rows into one canonical row
- pushing the distinction into child printings when the distinction is canonical
- mutating canonical `name` to force uniqueness
- leaving both rows with empty/base `variant_key`
- using source-specific slug text as canonical identity without normalization

## PERFECT ORDER APPLICATION

This rule applies immediately to the 6 proven collision groups in Perfect Order:

- 089/088 Spewpa
- 090/088 Rowlet
- 092/088 Aurorus
- 093/088 Dedenne
- 094/088 Clefairy
- 095/088 Espurr

For each of these:
- keep base name unchanged
- create separate canonical candidates
- assign distinct `variant_key`
- attach matching `illustration_category`
- display using `<name> <number> (<category>)`

## DONE CRITERIA

This rule is complete when the system enforces:

1. same-name same-number identity-bearing collisions become separate canonical rows
2. `variant_key` is mandatory for these groups
3. canonical `name` remains unchanged
4. UI label is derived from name + number + category
5. search / pricing / vault treat them as distinct identities
6. no auto-collapse path remains for this collision class
