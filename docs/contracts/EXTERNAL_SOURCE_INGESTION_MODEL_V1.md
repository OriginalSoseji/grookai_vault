# EXTERNAL_SOURCE_INGESTION_MODEL_V1

Status: ACTIVE  
Type: System Contract  
Scope: Governs how external catalog / discovery rows, and any external rows intended to participate in canonical expansion, enter Grookai and move toward canonical truth  
Authority: Aligns with `GROOKAI_RULEBOOK.md`, `REFERENCE_BACKED_IDENTITY_CONTRACT_V1.md`, `MULTI_SOURCE_ARCHITECTURE_INVARIANTS_V1.md`, `CANON_WAREHOUSE_INTAKE_CONTRACT_V1.md`, and `PRINTED_IDENTITY_MODEL_V1.md`

---

## 1. Purpose

This contract defines the authoritative ingestion model for external-source rows that may participate in canonical comparison, canon-gate review, or future canonical expansion inside Grookai Vault.

Supported examples include:

- TCGdex
- PokemonAPI
- JustTCG
- future catalog, pricing, or discovery sources

None of these sources are canonical by default.

This contract does not invalidate already-authorized source-isolated pricing or market-intelligence domains that remain non-canonical and do not participate in canon-bound intake.

---

## 2. Core Principle

External sources are upstream references.

Grookai owns canonical truth.

Printed physical identity outranks external modeling.

No external source may write directly into canon without first passing Grookai-controlled gates.

---

## 3. Shared Raw Ingress Rule

All external-source intake that is canon-bound, discovery-bound, or comparison-bound must enter through:

- `public.raw_imports`

Dedicated per-source raw tables are not lawful for this canon-bound ingress model unless a future contract explicitly overrides this rule.

Every raw ingress row must remain source-isolated inside the shared lane through:

- `source`
- `payload._kind`
- preserved upstream identifiers inside `payload`

Examples of required preserved upstream identifiers include:

- `_external_id`
- source card ids
- source set ids
- `tcgplayerId`

Coexistence inside `raw_imports` is intentional and lawful.

This shared ingress surface does not remove source isolation after intake.

After raw ingress, source-specific normalization rules, comparison logic, mapping helpers, and domain tables may remain isolated where existing contracts require that isolation.

Source-isolated pricing domains that do not participate in canonical expansion remain governed by their own contracts until they enter this canon-bound model.

---

## 4. Required Source Phases

Every external-source row governed by this model must move through the following ordered phases:

1. Raw Intake
2. Normalization
3. Comparison / Match
4. Canon Gate
5. Review / Staging
6. Canon Promotion

No phase may be skipped.

Raw existence alone never authorizes canon mutation.

---

## 5. Raw Intake Rules

Raw intake must:

- preserve the full upstream payload
- preserve upstream identifiers
- preserve source provenance
- remain replay-safe and idempotent according to repo conventions
- avoid premature canonical assumptions

Raw intake is a receipt layer, not a truth layer.

---

## 6. Normalization Rules

Source-specific normalization is required before comparison.

Normalization may include deterministic read-model fields such as:

- collector number parsing
- printed total extraction
- base-name extraction
- modifier extraction
- source-specific set hints

Normalization is interpretive and comparison-oriented.

Normalization is not canonical truth by itself.

---

## 7. Comparison / Match Rules

External rows must be compared to current canon only through lawful, deterministic methods such as:

- explicit external mapping bridges
- structured identity comparisons
- explicit set mapping rules
- ambiguity detection

Ambiguity must never be auto-resolved.

If multiple plausible matches exist, the row must remain ambiguous until a governed downstream phase resolves it.

---

## 8. Canon Gate Rules

Every normalized external row must be classified into at least one of these buckets:

- `CLEAN_CANON_CANDIDATE`
- `PRINTED_IDENTITY_REVIEW`
- `NON_CANDIDATE`

Hard rules:

- alpha-suffixed or synthetic upstream numbering is not automatically canon-ready
- parenthetical modifiers are not automatically canonical identity
- upstream formatting is evidence, not truth
- printed physical identity remains the authority

Canon-gate output is a classifier result, not a promotion decision.

---

## 9. Review / Staging Layer Rules

External discovery candidates require a dedicated downstream review or staging layer before canon promotion.

Current evidence-driven warehouse lanes are not automatically suitable for external-source discovery candidates.

Why:

- current warehouse intake is built for user submissions
- current warehouse intake requires uploader identity
- current warehouse intake requires evidence-rich submission context
- current warehouse evidence shapes are designed for physical evidence packages, not upstream discovery receipts

Externally discovered rows are not the same thing as physically evidenced user submissions.

Therefore, JustTCG-style candidates cannot simply be injected into the current warehouse lane without a governing contract that explicitly defines:

- provenance shape
- classifier outcome persistence
- replay-safe uniqueness
- external discovery review semantics

Future external discovery staging must preserve:

- raw source provenance
- normalized comparison fields
- canon-gate classifier output

---

## 10. Canon Promotion Rules

Only candidates that survive all prior phases may become canon candidates for promotion.

Promotion into `card_prints` is a separate governed action.

Raw existence does not imply canonical legitimacy.

External discovery must never bypass rule review, founder review, or any later promotion gate required by the active canon pipeline.

---

## 11. Source Coexistence Rule

Multiple external sources may coexist for the same object class inside `raw_imports`.

Examples:

- TCGdex raw
- PokemonAPI raw
- JustTCG raw

This is not duplication by itself.

It is lawful multi-source evidence.

Source coexistence improves later normalization, comparison, and ambiguity detection without granting any one source canonical authority.

---

## 12. Future Migration Direction

Long-term direction is:

- external-source ingestion converges toward this shared raw-first model
- older direct-ish source flows are realigned only in controlled phases
- no blind rip-and-replace is allowed

Any realignment must preserve:

- replay safety
- provenance
- existing lawful mappings
- canon isolation

---

## 13. Forbidden Behaviors

The following are forbidden:

- direct external-source canon writes without passing all required phases
- treating upstream formatting as canonical truth
- auto-resolving ambiguity
- mixing external discovery with evidence-driven user warehouse flows without a governing contract
- dropping provenance
- promoting rows to canon directly from raw ingress

---

## 14. Result

Grookai gains:

- unified external ingress
- preserved source provenance
- deterministic comparison
- safer canon expansion
- future multi-source discovery power

This model keeps canon authoritative while making external discovery operationally useful.

---

## 15. Final Principle

External sources may supply evidence, candidates, and enrichment.

Grookai alone decides what becomes real.
