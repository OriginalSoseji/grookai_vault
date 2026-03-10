# Grookai Vault — DB Hardening V1 Plan (No Drift)

## North Star

Build one of the best Pokémon TCG databases in the world:
deterministic identity, consistent metadata (rarity/numbering), full provenance/mapping clarity, and clean image surfaces — where every null and exception is intentional and auditable.

## Current Verified Status

### Quick fixes completed (verified by SQL)
- **sv10.5w number corruption (partial resolution)**
  - `card_prints.number_plain` is a **generated column**.
  - Setting `card_prints.number` to `001/86` caused `number_plain` to become `00186` due to the generator expression.
  - Safest rollback applied:
    - Reverted `sv10.5w.number` to **left-side only** (`001…173`) using `print_identity_key`.
    - Verified `sv10.5w.number_plain` is back to **1..173** and stable.
  - Fact: `sv10.5w` is **White Flare**. TCGdex reports `cardCount.total=173`, `cardCount.official=86`. Denominator should be **86** if we ever store `/86`, but we cannot yet due to generated column logic.

- **Image governance normalization**
  - Applied: `image_status='ok'` where `image_url` exists and `image_status` was null/empty.
  - Result: missing `image_status` reduced **8,499 → 548**. `image_ok` now **21,017**.

### Critical findings (not fixed yet)
A) **Generated column bug (schema-level)**
- Current generated expression for `card_prints.number_plain`:
  - `regexp_replace(number, '[^0-9]', '', 'g')`
- This is wrong for x/y numbering because it concatenates digits:
  - `001/86` → `00186`
- Verified: only **173** rows currently have slash numbers, all from `sv10.5w`.
- Proper fix requires dependency-ordered schema work (views/indexes/constraints).

B) **Rarity completeness is not “broken,” but ingestion is incomplete**
- Global scoreboard (pre quick-fix changes):
  - total prints: **21,576**
  - missing rarity: **4,483**
  - tcgdex-only lane: **13,058** prints with **4,072** missing rarity
  - both (tcgdex + pokemonapi): **7,317** prints, **193** missing rarity
  - pokemonapi-only: **307** prints, **127** missing rarity
- TCGdex raw payload shape inconsistency:
  - tcgdex raw_imports rows: **22,321**
  - only **1** row contains rich card fields including `card.rarity`
  - **22,122** rows are “slim” shape: id/name/localId/image only
  - example: sv03 has 230 tcgdex raw cards, **0** with rarity
  - conclusion: to normalize rarity from TCGdex, ingestion must store full card payload consistently.
- PokemonAPI-only missing rarity:
  - For the 127 candidates: raw_imports join succeeds but `payload.rarity` is null/empty for all.
  - No backfill possible without re-ingest/enrichment.

C) **Mapping/materialization gate failures**
- Sets with card raws but **0 prints**:
  - sv1 (150 raws), sm35 (81 raws), pop9 (18 raws)
- Proven root cause:
  - external_mappings has **0** pokemonapi mappings for sv1-*, sm35-*, pop9-*
  - set_code_classification shows:
    - sv1 is alias → canonical_set_code sv01 (is_canon=false)
    - sm35 and pop9 have dead non-canon rows with null ids
- Also noted: sets table has both sv1 and sv01; metadata split (sv1 has release_date, sv01 null). Hygiene later.

D) **Identity gaps remain**
- missing number_plain: **460**
- major sets: swsh45sv (122), cel25c (26)
- swsh45sv has images but missing identity fields; raws contain numbers → mapping omission.

E) **Mapping gaps**
- prints_with_no_mappings: **894** (needs set breakdown + repair plan)

F) **Image url gaps**
- missing image_url: **559** (needs set breakdown; respect legal source policy)

---

## Severity Matrix (Ranked)

| Rank | Issue | User Impact | Systemic Risk | Scope / Complexity | Preconditions (Audit Gates) | Proposed Phase | STOP Conditions |
|---:|---|---|---|---|---|---|---|
| 1 | A) `number_plain` generated bug (slash numbering) | Incorrect identity for affected set; future slash sets cannot be stored safely | Schema-level correctness; risk of corrupt joins/index uniqueness | High (dependency-ordered migration) | ✅ Enumerate dependent views/indexes/constraints; ✅ confirm exact generated expression; ✅ confirm all slash rows are sv10.5w only | Phase 1 | Any unknown dependency; any uniqueness/index mismatch; any non-sv10.5w slash rows appear |
| 2 | C) Sets with raws but 0 prints (sv1, sm35, pop9) | Missing sets in catalog; users can’t find cards | Gate logic / classification correctness risk | Medium–High | ✅ Prove classification + mapping gate path; ✅ prove intended canon/alias resolution | Phase 2 | Ambiguous canon authority; missing/invalid classification rows; unexpected additional zero-print sets |
| 3 | D) Missing number_plain (460) concentrated in swsh45sv/cel25c | Search/detail accuracy degraded; “ghost” identity surfaces | Identity integrity risk | Medium | ✅ Set-level breakdown; ✅ prove raws contain needed fields; ✅ prove mapping omission vs normalization omission | Phase 3 | Raws do not contain required identity; conflicting numbering formats found |
| 4 | E) Prints with no mappings (894) | Weak provenance; harder repairs; limits enrichment flows | Provenance integrity risk | Medium | ✅ Set/source breakdown; ✅ prove whether mappings should exist per source contract | Phase 4 | Any set is in a deferred bucket; mapping uniqueness conflicts |
| 5 | B) Rarity gap (4,483) due to ingestion shape | Rarity filters/UX incomplete; “world-class” quality unmet | Ongoing data incompleteness unless fixed at source | High (but can be phased) | ✅ Confirm tcgdex ingestion contract; ✅ confirm availability of rich endpoints; ✅ decide enrichment lane | Phase 5 | Upstream cannot provide rarity reliably; contract ambiguity about rarity definitions |
| 6 | F) Missing image_url (559) | Visual gaps; trust/UX hit | Medium; depends on legality/source | Medium | ✅ Set breakdown; ✅ confirm allowed source policy per set; ✅ confirm identity-first principle (not ghosts) | Phase 6 | Any image source violates legal policy; identity ambiguity (ghost vs canon) persists |

---

## Phased Hardening Plan (Audit → Dry-Run → Apply)

### Phase 0 — Audit Pack (Re-verify ground truth)
Entry criteria:
- [ ] Ability to run SQL against the target environment (local/staging) with the same schema as referenced.

Audit checklist (placeholders; do not assume results):
- [ ] Recount global totals (prints, missing rarity, missing image_url, missing mappings, missing number_plain).
- [ ] Enumerate all rows with slash numbers and list by set_code.
- [ ] Identify dependency graph for `card_prints.number_plain` (views, indexes, constraints).
- [ ] Set-level breakdown:
  - [ ] missing number_plain by set_code
  - [ ] prints_with_no_mappings by set_code and by source
  - [ ] missing image_url by set_code
  - [ ] missing rarity by set_code + lane (tcgdex-only / both / pokemonapi-only)

Dry-run expectation artifacts:
- A single JSON or markdown report containing:
  - counts, set breakdown tables, and dependency list.

STOP conditions:
- Any audit query contradicts the “Verified Status” section above.

---

### Phase 1 — Fix schema correctness for slash numbering (`number_plain`)
Goal:
- Make x/y numbering safe without concatenating digits.

Entry criteria (must be proven first):
- [ ] Exact generated expression for `card_prints.number_plain` confirmed.
- [ ] Full list of dependent views/indexes/constraints captured (no missing deps).
- [ ] Confirm only sv10.5w currently uses slash format (or enumerate all sets that do).

Dry-run expectation:
- A dependency-ordered migration plan document (drop/recreate views in safe order) that:
  - updates generated expression to parse left side of slash
  - proves uniqueness constraints remain valid

Apply step (high-level only):
- Create a dependency-ordered migration that:
  - updates how `number_plain` is computed for slash numbers
  - rebuilds dependent views/indexes safely without CASCADE nukes

Verification criteria:
- [ ] For `001/86`, number_plain becomes `1` (or `001` normalized to integer 1), not `00186`.
- [ ] No uniqueness violations on (game_id,set_id,number_plain,variant_key) and (set_code,number_plain).
- [ ] All dependent views recreate successfully and match expected row counts.

STOP conditions:
- Unknown dependency discovered mid-migration.
- Any uniqueness violation appears.
- Any view definition cannot be recreated deterministically.

---

### Phase 2 — Repair gate failures: raws exist but 0 prints (sv1, sm35, pop9)
Goal:
- Ensure canon/alias resolution and mapping gates allow materialization.

Entry criteria:
- [ ] Confirm classification rows for these sets and intended canonical_set_code behavior.
- [ ] Confirm why pokemonapi mappings are absent and whether they should exist.
- [ ] Confirm whether these sets are deferred (Bucket 2/3/4) or expected active.

Dry-run expectation:
- A set-by-set report describing:
  - what raw_imports exist
  - what mapping keys are missing
  - which worker/gate prevented print creation (must be proven)

Apply step (high-level only):
- Adjust ingestion/mapping workflow so alias → canon resolution happens before gating, or ensure classification entries exist and are valid.

Verification criteria:
- [ ] Prints exist for each set at expected counts.
- [ ] External mappings populate per contract.
- [ ] No duplicate set lanes created.

STOP conditions:
- Canon authority ambiguous.
- Classification data is inconsistent (null ids, conflicting canon flags) beyond the proven cases.

---

### Phase 3 — Identity fill: missing `number_plain` (460) focused sets
Goal:
- Close contained identity gaps (swsh45sv, cel25c) without creating ghosts.

Entry criteria:
- [ ] For each target set, prove raw_imports contain the required numbering fields.
- [ ] Prove whether omission is in mapping vs normalization stage.

Dry-run expectation:
- A deterministic candidate list (card_print_id + raw source row) showing exactly what will be updated.

Apply step (high-level only):
- Normalize/repair identity fields from raws into canonical prints.

Verification criteria:
- [ ] missing number_plain decreases by the expected count for the targeted sets.
- [ ] No cross-set number collisions introduced.
- [ ] Search/detail screens no longer rely on incomplete identity for those sets.

STOP conditions:
- Raws lack needed fields.
- Conflicting numbering formats discovered that require a new contract.

---

### Phase 4 — Mapping coverage repair (894 prints with no mappings)
Goal:
- Provenance clarity: every print either has mappings or is intentionally unmapped (auditable).

Entry criteria:
- [ ] Set/source breakdown for unmapped prints.
- [ ] Confirm which sets are deferred/unmapped by design.

Dry-run expectation:
- A list grouped by set_code with:
  - unmapped_print_ids
  - expected mapping source(s)
  - reason code if intentionally unmapped

Apply step (high-level only):
- Run deterministic mapping repair workflows per set bucket.

Verification criteria:
- [ ] prints_with_no_mappings decreases in targeted non-deferred sets.
- [ ] No uniqueness conflicts in external_mappings(source, external_id).

STOP conditions:
- Any set belongs to a deferred bucket unexpectedly.
- Any uniqueness conflicts appear without an approved merge playbook.

---

### Phase 5 — Rarity enrichment (ingestion contract upgrade)
Goal:
- Rarity becomes consistent and auditable, sourced from full upstream payloads.

Entry criteria:
- [ ] Confirm TCGdex can provide full card payloads consistently (endpoint + fields).
- [ ] Define ingestion contract for tcgdex raw_imports to store rich payloads (no slim-only drift).
- [ ] Confirm how rarity should be normalized (enum mapping) and what “unknown” means.

Dry-run expectation:
- A before/after rarity-fill report:
  - per lane (tcgdex-only / both / pokemonapi-only)
  - per set_code top offenders

Apply step (high-level only):
- Upgrade tcgdex ingestion to store full payloads for cards; then normalize rarity from that payload.
- For PokemonAPI-only null rarity, re-ingest/enrich from upstream if available.

Verification criteria:
- [ ] missing rarity drops by the expected amount per lane.
- [ ] No silent overwrites: every rarity change traceable to a source payload.

STOP conditions:
- Upstream cannot supply rarity fields consistently.
- Rarity semantics differ per set in a way that requires a new normalization contract.

---

### Phase 6 — Image URL gaps (559) with legal policy
Goal:
- Improve image completeness without violating the legal source policy.

Entry criteria:
- [ ] Set breakdown for missing image_url.
- [ ] Confirm identity-first: missing images are not caused by ghost/alias lane issues.
- [ ] Confirm allowed source options per set.

Dry-run expectation:
- Candidate list per set:
  - card_print_id
  - reason missing
  - allowed source path (if any)

Apply step (high-level only):
- Run approved image backfill pipeline(s) strictly within allowed sources.

Verification criteria:
- [ ] missing image_url decreases by expected count.
- [ ] No illegal sources introduced.
- [ ] image_status stays consistent with image_url state.

STOP conditions:
- Any image source violates policy.
- Identity ambiguity exists (canon vs ghost) for affected prints.

---

## No Drift Rules (Locked)
- Audit → Dry-Run → Apply only.
- No guessing. No CASCADE nukes.
- One bucket at a time, with set-level proofs.
- Every null/exception must have an auditable reason.
- Image work must respect legal source policy.
