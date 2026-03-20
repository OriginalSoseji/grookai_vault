# PRICING_OBSERVATION_OFFLINE_VALIDATION_V1

## Scope

This audit validates `PRICING_OBSERVATION_LAYER_V1` without any eBay API calls.

Validation targets:

- `backend/pricing/pricing_observation_layer_v1.mjs`
- `backend/pricing/ebay_browse_prices_worker.mjs`
- `backend/pricing/run_pricing_observation_fixture_v1.mjs`
- `backend/pricing/fixtures/pricing_observation_fixture_v1.json`
- `supabase/migrations/20260319150000_pricing_observations_v1.sql`
- `public.v_pricing_observations_accepted`
- `public.v_pricing_observation_audit`

Validation method:

- synthetic fixtures only
- real observation persistence via `insertPricingObservations(...)`
- real classifier logic via exported production helpers from `ebay_browse_prices_worker.mjs`
- zero Browse API traffic
- rerunnable cleanup via `--cleanup`

Important environment note:

- local Supabase was checked first
- local `card_prints` remained unseeded after reset, so the harness used the linked project for canonical target selection and fixture insertion
- this still consumed zero eBay API calls

## Targets Used

The harness selected these real canonical targets from the linked project:

1. `base_primary`
   - `card_print_id = daaa53ec-35d7-414b-a27c-f55748936699`
   - `Charizard`
   - `set_code = base1`
   - `number_plain = 4`

2. `promo_primary`
   - `card_print_id = df470d58-0ba7-46d4-ac01-38bcf3c1706e`
   - `Pikachu`
   - `set_code = swshp`
   - `number_plain = 020`

3. `modern_primary`
   - `card_print_id = f26bdc12-2e68-441a-81a3-466922ab21b8`
   - `Pikachu`
   - `set_code = sv02`
   - `number_plain = 62`

4. `secondary_primary`
   - `card_print_id = 4300206c-277b-4a0a-956e-e06020131ca0`
   - `Gyarados`
   - `set_code = base1`
   - `number_plain = 6`

5. `base_secondary`
   - `card_print_id = 5390df67-a217-47f9-90ab-7399fdff5269`
   - `Blastoise`
   - `set_code = base1`
   - `number_plain = 2`

## Fixture Design

Fixture file:

- `backend/pricing/fixtures/pricing_observation_fixture_v1.json`

Total rows: `25`

Categories:

1. Clean Accepts
   - modern raw NM and LP
   - promo raw NM
   - Base Set raw LP, MP, and Mint

2. Must Reject
   - slab listings with strong direct signals
   - slab listings with grade-pattern signals
   - lot / sealed / wrong-set listings

3. Must Stage
   - missing collector number
   - ambiguous set
   - weak title
   - missing title

4. Edge Cases
   - reverse/holo ambiguity
   - suspicious outlier price
   - `Mint 10`
   - `Gem Mint condition`
   - wrong collector number with raw-safe wording
   - wrong collector number with PSA wording

Each fixture row includes:

- `external_id`
- `title`
- `listing_url`
- `price`
- `shipping`
- `currency`
- `condition_raw`
- `listing_type`
- `raw_payload`
- expected classification fields
- slab-sensitive `expected_is_graded`

All fixture rows use the `fixture_v1_` prefix so they are easy to isolate and delete.

## Execution Summary

Commands executed:

```powershell
cd C:\grookai_vault
node backend/pricing/run_pricing_observation_fixture_v1.mjs --cleanup
node backend/pricing/run_pricing_observation_fixture_v1.mjs
```

Execution context:

- `linked`

Insertion summary:

- inserted rows: `25`
- expected rows: `25`
- expectation mismatches: `0`

Equivalent validation checks:

1. `count(*) where external_id like 'fixture_v1_%'`
   - `25`

2. `classification x mapping_status`
   - `accepted + mapped = 9`
   - `rejected + ambiguous = 9`
   - `rejected + unmapped = 3`
   - `staged + ambiguous = 3`
   - `staged + unmapped = 1`

3. `accepted rows where mapping_status != mapped`
   - `0`

## Validation Results

Hard safety result:

- every accepted observation remained mapped
- no accepted observation bypassed the mapping gate
- rejected and staged observations stayed out of `v_pricing_observations_accepted`

Accepted rows by `card_print_id`:

- `f26bdc12-2e68-441a-81a3-466922ab21b8` (`modern_primary`) = `4`
- `df470d58-0ba7-46d4-ac01-38bcf3c1706e` (`promo_primary`) = `2`
- `4300206c-277b-4a0a-956e-e06020131ca0` (`secondary_primary`) = `1`
- `5390df67-a217-47f9-90ab-7399fdff5269` (`base_secondary`) = `1`
- `daaa53ec-35d7-414b-a27c-f55748936699` (`base_primary`) = `1`

Representative staged rows:

- `fixture_v1_stage_ambiguous_set` -> `staged + ambiguous` (`no_condition_match`)
- `fixture_v1_stage_missing_collector` -> `staged + ambiguous` (`no_condition_match`)
- `fixture_v1_stage_missing_title` -> `staged + unmapped` (`missing_title`)
- `fixture_v1_stage_weak_title` -> `staged + ambiguous` (`no_condition_match`)

Representative rejected rows:

- `fixture_v1_edge_mint_10_ambiguous` -> `rejected + ambiguous` (`graded`)
- `fixture_v1_exact_sv02_025_psa10` -> `rejected + ambiguous` (`graded`)
- `fixture_v1_exact_sv02_025_rawsafe` -> `rejected + unmapped` (`collector_number_mismatch`)
- `fixture_v1_reject_charizard_bgs95` -> `rejected + ambiguous` (`graded`)
- `fixture_v1_reject_gyarados_gem_mint_10` -> `rejected + ambiguous` (`graded`)

`v_pricing_observation_audit` sample:

- `secondary_primary`: `accepted + mapped`, `listing_count = 1`, `avg_confidence = 1`
- `base_secondary`: `accepted + mapped`, `listing_count = 1`, `avg_confidence = 1`
- `base_primary`: `accepted + mapped`, `listing_count = 1`, `avg_confidence = 1`
- `promo_primary`: `accepted + mapped`, `listing_count = 2`, `avg_confidence = 1`
- `modern_primary`: `accepted + mapped`, `listing_count = 4`, `avg_confidence = 0.925`

## Mapping + Classification Results

The observation layer now proves the core safety boundary:

- accepted rows are all `mapping_status = mapped`
- unmapped rows are never accepted
- ambiguous rows are never accepted
- accepted aggregation remains explainable from persisted rows

Category outcomes:

1. Clean Accepts
   - all six clean fixtures matched expectations
   - this includes `Blastoise Base Set 2/102 Moderately Played`, which no longer false-rejects as `wrong_set`

2. Must Reject
   - slab, lot, sealed, and wrong-set cases all rejected as expected

3. Must Stage
   - weak-identity cases staged as expected unless they clearly belonged in rejection

4. Edge Cases
   - `Mint 10` classified as graded and rejected
   - `Gem Mint condition` remained raw-safe and accepted
   - collector-number mismatch cases stayed out of accepted aggregation

## Slab Detection Hardening Results

Production slab detection now uses explicit signal tiers:

1. Strong direct slab signals
   - `PSA`
   - `BGS`
   - `CGC`
   - `TAG`
   - `graded`
   - `slab`
   - `cert`
   - `pristine`

2. Grade-pattern slab signals
   - `Gem Mint 10`
   - `Mint 10`
   - grader acronym + score patterns

3. Raw-safe condition phrases that do not imply slab by themselves
   - `Mint`
   - `Near Mint`
   - `NM`
   - `Light Play`
   - `Lightly Played`
   - `Moderately Played`

Observed results:

- `Gyarados Base Set 6 Mint` -> `actual_is_graded = false`
- `Pikachu SV02 62 Near Mint` -> `actual_is_graded = false`
- `Pikachu 020 PSA 10` -> `actual_is_graded = true`
- `Gyarados Base Set 6 Gem Mint 10` -> `actual_is_graded = true`
- `Charizard 4/102 BGS 9.5` -> `actual_is_graded = true`
- `Umbreon CGC 10 Pristine` -> `actual_is_graded = true`
- `Mewtwo TAG 10` -> `actual_is_graded = true`
- `Gyarados Base Set 6 Mint 10` -> `actual_is_graded = true`
- `Pikachu Gem Mint condition` -> `actual_is_graded = false`
- `Gyarados Minty fresh condition` -> `actual_is_graded = false`

Result:

- standalone raw-safe `Mint` no longer triggers graded
- strong slab phrases and grade-pattern phrases do trigger graded

## Condition Normalization Hardening Results

Condition normalization now evaluates more specific phrases before broader played-condition matches.

Observed results:

- `Light Play` -> `lp`
- `Lightly Played` -> `lp`
- `Moderately Played` -> `mp`
- `Near Mint` -> `nm`
- `Mint` -> `nm` in raw-safe contexts
- reverse-holo with no explicit condition still falls back through current `unknown_as_lp` behavior

Most important regression fixes confirmed:

1. `Light Play`
   - before hardening: mis-bucketed as `mp`
   - after hardening: correctly bucketed as `lp`

2. `Gyarados Base Set 6 Mint`
   - before hardening: falsely rejected as graded
   - after hardening: accepted as raw `nm`

3. `Blastoise Base Set 2/102 Moderately Played`
   - before hardening: false `wrong_set` because `base set 2` matched inside the collector-number phrase
   - after hardening: accepted as mapped raw `mp`

## Explainability Proof

Accepted comps are now fully traceable from persisted observations.

Example target: `modern_primary` (`Pikachu`, `sv02`, `62`)

Accepted rows in `v_pricing_observations_accepted`:

1. `fixture_v1_clean_modern_lp`
   - title: `Pikachu SV02 62 Light Play`
   - bucket: `lp`
   - total price: `9.2`
   - confidence: `1`

2. `fixture_v1_stage_gem_mint_condition`
   - title: `Pikachu Gem Mint condition`
   - bucket: `nm`
   - total price: `22.2`
   - confidence: `1`

3. `fixture_v1_edge_reverse_holo_unknown_lp`
   - title: `Pikachu Paldea Evolved SV02 62 Reverse Holo`
   - bucket: `lp`
   - total price: `14.49`
   - confidence: `0.7`

4. `fixture_v1_clean_modern_nm`
   - title: `Pikachu SV02 62 Near Mint`
   - bucket: `nm`
   - total price: `13.49`
   - confidence: `1`

Example target: `promo_primary` (`Pikachu`, `swshp`, `020`)

Accepted rows:

1. `fixture_v1_clean_promo_nm`
   - bucket: `nm`
   - total price: `16.5`
   - confidence: `1`

2. `fixture_v1_edge_outlier_price`
   - bucket: `nm`
   - total price: `9999`
   - confidence: `1`

This proves the observation layer can now answer:

- which exact listings were used
- why they were accepted
- which condition bucket they entered
- what values they contributed as comps

## Risk Findings

1. Observation-layer safety passed, but pricing-quality controls remain separate work.
   - evidence: the `9999` outlier fixture is still accepted because this pass hardened classification, not outlier filtering

2. `Gem Mint condition` is intentionally treated as raw-safe unless paired with a score or grader context.
   - evidence: `fixture_v1_stage_gem_mint_condition` was accepted as `nm`
   - this matches the current tiered slab rule, but it remains a title pattern worth monitoring

3. Local-only validation is still limited by missing local catalog seed data.
   - evidence: the runner had to use the linked project after local target discovery failed

## Verdict

PASS

Why:

- fixture rows inserted successfully
- expected accepted / rejected / staged split matched with zero mismatches
- accepted rows remained fully mapped
- `Light Play` family now normalizes to `lp`
- standalone `Mint` no longer falsely triggers graded
- strong slab phrases and grade-pattern phrases do trigger graded
- accepted comps remain explainable from persisted observations

