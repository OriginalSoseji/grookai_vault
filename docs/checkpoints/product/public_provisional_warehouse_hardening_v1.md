# PUBLIC PROVISIONAL WAREHOUSE HARDENING V1

**Status:** COMPLETE  
**Date:** 2026-04-22  
**Domain:** Product / Read Layer / Trust Boundary

---

## 1. CONTEXT

Grookai needs a way to show that some card-like records are known to the system before they become canonical cards. The Canon Warehouse is the correct non-canonical source because it already owns candidate intake, source-backed identity payloads, classification state, and promotion state.

Public provisional visibility required hard separation from canon because canonical `card_prints` are the only truth cards. A warehouse candidate may be useful for discovery, but it must not receive GV-ID authority, canonical routing, vault actions, pricing, provenance, ownership treatment, or public truth badges.

This checkpoint closes the V1 hardening layer that allows limited search-only provisional visibility without contaminating the canonical card domain.

---

## 2. PROBLEM

Warehouse candidates existed and some carried enough source-backed identity to be shown honestly as unconfirmed cards. Direct exposure would have created unacceptable risk:

- raw warehouse payloads could leak
- internal review state could become public product state
- provisional records could be mixed with canonical card results
- warehouse ids could be mistaken for GV-IDs
- promoted or staged rows could continue to appear as provisional
- public UI could accidentally show vault, pricing, ownership, or provenance affordances

Before this work, there was no public-safe contract, no centralized public adapter, no route guard for non-canonical card routing, and no lint-level restriction against public direct warehouse access.

---

## 3. DECISION

The final architectural decision is:

- canonical `card_prints` remain the only truth cards
- warehouse powers only a safe provisional subset
- public provisional exposure is search-only for V1
- all public provisional access is adapter-based
- provisional rows must never impersonate canon
- provisional rows must never enter vault, pricing, ownership, provenance, or canonical trust flows

The governing contract is `PUBLIC_PROVISIONAL_WAREHOUSE_CARD_CONTRACT_V1`.

---

## 4. WHAT CHANGED

Implemented hardening files:

- `apps/web/src/lib/provisional/getPublicProvisionalCards.ts`
  - centralized the only public warehouse read path
  - queries only `canon_warehouse_candidates`
  - applies source-backed and state allowlist filters
  - excludes alias, slot-conflict, ambiguous, printing-only, image-only, and blocked action rows
  - throws on promoted-row leakage
  - throws on GV-ID leakage
  - skips partial identity rows
  - filters unsafe images
  - returns frozen whitelist-only read models

- `apps/web/src/lib/provisional/publicProvisionalTypes.ts`
  - defines `PublicProvisionalCard` as readonly
  - keeps provisional state and labels constrained to the contract-approved values

- `apps/web/src/app/api/resolver/search/route.ts`
  - returns canonical results and provisional results in separate arrays
  - preserves canonical results as the primary result set
  - fails on GV-ID leakage into provisional results
  - rethrows adapter `SECURITY:` failures instead of hiding them

- `apps/web/src/components/provisional/PublicProvisionalSearchSection.tsx`
  - renders provisional rows in a separate section
  - forces `Unconfirmed Cards` header
  - applies `noindex,nofollow`
  - excludes vault, pricing, ownership, and provenance actions

- `apps/web/src/lib/getPublicCardByGvId.ts`
  - adds a canonical route guard that rejects non-canonical rows without GV-ID

- `apps/web/.eslintrc.json`
  - adds a public-code direct-access restriction for `canon_warehouse_candidates`
  - allows only the public adapter plus existing founder/internal warehouse tooling

- `apps/web/src/lib/provisional/getPublicProvisionalCards.test.ts`
  - documents the expected failure modes and valid output behavior

Verification matrix:

| Invariant | Status | Proof |
| --- | --- | --- |
| Adapter is the only lawful public warehouse entrypoint | PASS | `getPublicProvisionalCards.ts` owns the public query; ESLint blocks public direct access elsewhere. |
| Allowed-state fail-closed guard exists | PASS | `ALLOWED_STATES` and post-query state validation are enforced. |
| Promoted row hard throw exists | PASS | Adapter throws `SECURITY: Promoted row leaked into provisional adapter`. |
| GV-ID hard throw exists | PASS | Adapter throws `SECURITY: GV-ID found on provisional row`. |
| Partial identity rows are skipped | PASS | `display_name`, `set_hint`, and `number_hint` are mandatory. |
| Public image filtering blocks unsafe paths | PASS | Non-HTTP, storage, signed, token, signature, and expires URLs are rejected. |
| Output object is frozen / readonly | PASS | `Object.freeze` plus readonly TypeScript read model. |
| Search returns canonical + provisional separately | PASS | API returns `canonical` and `provisional` as separate arrays. |
| Canonical route rejects non-canonical entities | PASS | `assertCanonicalCardRouteRow` throws on missing `gv_id`. |
| Provisional UI has no vault / pricing / ownership / provenance actions | PASS | UI component contains only image, identity hints, label, and explanation. |
| ESLint guard prevents direct warehouse access in public code | PASS | `no-restricted-syntax` blocks the table string outside allowed paths. |
| Tests cover key failure modes | PASS | Tests cover disallowed state, promoted throw, GV-ID throw, missing identity, private image, route misuse, and frozen valid output. |

Unrelated warning:

- `apps/web/src/components/warehouse/WarehouseSubmissionForm.tsx` still has an existing Next lint warning for `<img>`. This is unrelated to the provisional public hardening layer.

---

## 5. CURRENT TRUTHS

- Provisional cards are visible but non-canonical.
- GV-ID remains canonical-only.
- `/card/[gv_id]` remains canonical-only.
- Provisional rows cannot enter vault flows.
- Provisional rows cannot enter pricing flows.
- Provisional rows cannot enter ownership flows.
- Provisional rows cannot enter provenance flows.
- Warehouse raw rows are not publicly exposed.
- Public provisional rendering is whitelist-based only.
- Search-only exposure is the only V1 surface.

---

## 6. INVARIANTS

- No GV-ID on provisional rows.
- No canonical route for provisional rows.
- No direct warehouse access in the public layer outside `getPublicProvisionalCards`.
- No raw warehouse payload exposure.
- No pricing actions on provisional UI.
- No vault actions on provisional UI.
- No ownership actions on provisional UI.
- No provenance actions on provisional UI.
- No blending of canonical and provisional result arrays.
- Promoted rows must never render as provisional.
- Partial identity rows must not render.
- Unsafe private or signed image paths must not render.

---

## 7. RISKS ELIMINATED

This work removed:

- accidental warehouse leakage
- canonical/provisional blending
- fake trust signals
- route confusion
- promoted-row provisional resurfacing
- GV-ID leakage through provisional rows
- future direct-access drift in public web code
- pricing, vault, ownership, and provenance affordance leakage

---

## 8. REMAINING LIMITS

- V1 is search-only.
- There is no provisional detail page.
- There is no promotion transition UX.
- There is no analytics layer specific to provisional exposure.
- Provisional surfaces should not be publicly indexed.
- Existing founder/internal warehouse tooling still reads warehouse directly by design and is outside the public provisional surface.
- Provisional tests are present as source tests, but the web package does not currently expose a dedicated test runner script.

---

## 9. WHY THIS MATTERED

This work is foundational because Grookai can now show uncertainty without corrupting truth. The system has a real product trust boundary:

- canon remains authoritative
- warehouse remains non-canonical
- public users can discover candidates without receiving false authority signals
- future discovery and promotion transition flows can be built on top of a locked separation model

Without this boundary, provisional visibility would risk turning review state into public truth.

---

## 10. LOCK

All future work touching public provisional warehouse exposure must comply with:

- `PUBLIC_PROVISIONAL_WAREHOUSE_CARD_CONTRACT_V1`
- the adapter-only public access rule
- canonical separation rules
- search-only V1 surface limits unless a successor contract expands the surface

Public code must not query `canon_warehouse_candidates` directly. Public code must use `getPublicProvisionalCards`.

Provisional rows must never receive GV-ID authority, canonical route authority, vault authority, pricing authority, ownership authority, or provenance authority.
