# EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1

Status: ACTIVE  
Type: System Contract  
Scope: Governs the lawful boundary between external discovery candidates and canonical truth  
Authority: Aligns with `GROOKAI_RULEBOOK.md`, `EXTERNAL_SOURCE_INGESTION_MODEL_V1.md`, `REFERENCE_BACKED_IDENTITY_CONTRACT_V1.md`, and `PRINTED_IDENTITY_MODEL_V1.md`

---

## 1. Purpose

This contract defines why external discovery staging exists.

External discovery candidates must not be promoted directly into canon.

Staging is required for domains with high identity complexity.

Special-case-heavy sources need a holding layer before truth acceptance.

---

## 2. Core Principle

Staging is non-canonical.

Staging preserves candidates, not truth.

Only reviewed and accepted candidates may move toward canon.

---

## 3. Input Sources

Lawful staging inputs are external-source candidates that have already passed:

- raw intake
- normalization
- comparison / match
- canon gate

Examples include:

- JustTCG
- future external catalog sources

This contract does not authorize direct raw-source staging without those earlier phases.

---

## 4. Staging Purpose

External discovery staging exists to hold:

- clean canon candidates pending review
- printed-identity review candidates
- provenance-backed external discoveries
- special cases requiring decision before canon

It is a safety buffer for unresolved but potentially valuable external discoveries.

---

## 5. Non-Canon Rule

Staged records are not canon.

Staged records do not imply validity.

Staged records must not be used as public truth, card identity authority, or canonical existence proof.

---

## 6. Gate Relationship

External discovery staging is allowed below the `40,000` canonical maturity threshold.

Canon expansion is not.

Staging is the safe buffer that prevents premature canon mutation while the canonical maturity gate is still blocking truth-layer expansion.

This exemption applies only to non-canonical staging.

It does not authorize:

- direct writes to `card_prints`
- direct writes to `external_mappings`
- auto-promotion
- bypass of review

---

## 7. Provenance Rule

Every staged row must preserve:

- source
- upstream id
- raw provenance
- classifier result
- enough context to reconstruct why the row entered staging

Dropping provenance is not lawful.

---

## 8. Forbidden Behaviors

The following are forbidden:

- direct canon writes from external-source raw data
- treating staged rows as canonical truth
- bypassing review
- dropping provenance
- using staging to evade printed identity review

This contract does not weaken printed identity authority.

---

## 9. Result

Grookai gains a safe non-canon holding layer for external discovery without weakening canon integrity.

---

## 10. Final Principle

External discovery may be preserved before it is believed.
