# Scanner Engine V2 Phase 1 Plan

Source of truth: `docs/contracts/scanner_engine_v2_contract.md`

Status: Plan only. No production code, migrations, schema changes, deployment work, or indexing work is included.

## 1. Scope (STRICT)

Phase 1 is the smallest useful implementation of Scanner Engine V2.

Included:

- ME sets only: `me01`, `me02`, and `me02.5`.
- One embedding model for both canonical card images and scanner image queries.
- Basic OCR for collector number and set code when visible.
- Existing `card_embeddings` table for stored canonical embeddings.
- Existing `embedding_lookup_v1` RPC for candidate retrieval.
- Existing AI pipeline as the fallback and source of truth.

Excluded:

- No expansion beyond ME sets.
- No stamp detection in Phase 1.
- No variant-specific instant acceptance unless number and set verification are unambiguous.
- No new model training.
- No new schema.
- No new migration.
- No production rollout until exit criteria are met.

Optional placeholder:

- Stamp or variant region detection may be represented as a future verifier signal, but it must not participate in Phase 1 acceptance.

## 2. Data Inputs

Phase 1 uses exactly these inputs:

- Canonical card images -> embeddings.
- Scanner images -> embedding queries.
- OCR extracted collector number.
- OCR extracted set code, if available.

Canonical card images:

- Limited to ME print coverage for `me01`, `me02`, and `me02.5`.
- Each indexed embedding must map to a known `card_print_id`.
- Each indexed row must carry the embedding model identifier used to generate it.

Scanner images:

- Must come from real scanner captures.
- Must satisfy the V2 capture quality prerequisite: full card visible, upright or normalizable, minimal glare, and sufficient resolution for OCR.
- Must be rejected to fallback if image decode, crop, OCR, or retrieval cannot complete reliably.

OCR output:

- `number`: normalized collector number from the visible card number region.
- `set_code`: normalized set code when visible or inferable from printed set text.
- Missing OCR is allowed only as a fallback reason. It must not produce an instant match in Phase 1.

## 3. Retrieval Layer (Minimal)

Embedding generation:

- Reuse the existing embedding service as the Phase 1 prototype embedding generator.
- Use the same embedding model for canonical images and scanner image queries.
- Record model identity in logs and test output so results are comparable.

Storage:

- Use the existing `card_embeddings` table.
- Phase 1 must treat stored embeddings as read-only during recognition tests.
- No new embedding rows are written as part of the Phase 1 fast-path decision.

Search:

- Use the existing `embedding_lookup_v1` RPC.
- Search only against the active single model and ME coverage domain.
- Use `top_k = 5`.

Retrieval output:

- Candidate `card_print_id`.
- Candidate set code.
- Candidate collector number.
- Embedding distance.
- Model identifier.

Retrieval rule:

- Retrieval only creates the candidate shortlist. It never confirms identity.

## 4. Verifier Layer (Minimal)

The verifier operates only on the `top_k = 5` candidate set.

Signals:

- OCR collector number.
- OCR set code, if available.
- Candidate collector number from canonical metadata.
- Candidate set code from canonical metadata.

Rules:

- If OCR number matches candidate number, that is a strong signal.
- If OCR set matches candidate set, that is a strong signal.
- If both number and set match exactly after normalization, the candidate passes verification.
- If number is missing, mismatched, or ambiguous, the candidate is rejected.
- If set code is available and mismatched, the candidate is rejected.
- If set code is unavailable, Phase 1 must reject rather than accept, because ME sets can contain visually similar cards and variants.
- Fuzzy name or artwork similarity is not sufficient for acceptance.
- Embedding distance is not a verification signal.

Acceptance requirement:

- A candidate passes only when OCR number and OCR set both match the candidate metadata.

## 5. Decision Logic

Decision rule:

IF exactly one candidate passes verification:

-> return that candidate instantly

ELSE:

-> fallback to the existing AI pipeline

Fallback reasons:

- No candidates returned.
- More than one candidate passes verification.
- No candidate passes verification.
- OCR number missing.
- OCR set missing.
- OCR mismatch.
- Retrieval error.
- Embedding generation error.
- Image decode or capture quality failure.

Decision constraints:

- Wrong instant matches are not acceptable.
- Any ambiguity must route to fallback.
- The existing AI pipeline remains the source of truth for unresolved scans.

## 6. Integration Point

Phase 1 runs after capture and before upload.

Flow:

capture
-> embedding lookup
-> verifier
-> decision

Accepted fast path:

- A clean capture produces an embedding query.
- Retrieval returns up to 5 ME candidates.
- OCR extracts number and set.
- Exactly one candidate passes verification.
- The app returns the verified identity without invoking fallback AI.

Fallback path:

- Any retrieval, OCR, verification, or decision failure routes to the existing upload -> AI -> resolver pipeline.
- Fallback behavior must remain unchanged.
- Fast-path failure must not be treated as scan failure.

## 7. Logging / Metrics

Track one structured event per scanner attempt.

Required fields:

- Scan identifier.
- Capture quality eligibility.
- Embedding model identifier.
- Embedding generation time.
- Retrieval time.
- Candidate count.
- Top candidate distance.
- OCR number result.
- OCR set result.
- Verifier pass count.
- Verifier reject reasons.
- Decision result: instant or fallback.
- Fallback reason, when applicable.
- Final resolved card from fallback, when available.

Required metrics:

- Embedding time.
- Retrieval time.
- Verifier result.
- Fallback rate.
- Success rate.
- Incorrect instant match count.
- Unsupported-set fallback count.

## 8. Test Plan

Minimum test set:

- 10 real ME scanner captures.
- Captures should include `me01`, `me02`, and `me02.5` where available.
- Captures must be clean enough to satisfy Phase 1 input requirements.
- Ground truth must be known before evaluating results.

Test procedure:

- Generate the scanner image embedding.
- Call `embedding_lookup_v1` with `top_k = 5`.
- Run OCR for collector number and set code.
- Run verifier against the returned candidates.
- Apply decision logic.
- Compare instant result or fallback result with ground truth.

PASS:

- Correct card is returned as an instant match after verification.
- Or correct card is top 1 and verified by number and set.

FAIL:

- Any wrong instant match.
- Excessive fallback on clean, supported ME scans.
- Missing fallback when verification is uncertain.
- Fast path adds material latency to the fallback path.

Required report:

- Image name.
- Ground truth card.
- Top 5 candidates.
- OCR number.
- OCR set.
- Verified candidate, if any.
- Decision.
- Timing.
- Failure reason, if any.

## 9. Exit Criteria

Phase 1 is successful only if all conditions are met:

- At least 10 real clean ME scans tested.
- At least 70% correct instant matches on clean supported scans.
- 0 incorrect instant matches.
- Existing fallback works 100% for rejected or uncertain cases.
- Total fast-path target remains under 300ms for accepted scans.
- Fallback path latency is not materially worsened.
- Each instant match has logged verifier evidence showing number and set agreement.

If any wrong instant match occurs, Phase 1 is not ready for release.

## 10. Risks

- OCR inaccuracies can reject otherwise correct candidates.
- OCR inaccuracies can become dangerous if accepted without exact matching.
- Current embedding model may not retrieve the true card in top 5 from real scanner images.
- ME embedding coverage may be incomplete or inconsistent.
- Android scanner images may fail decode or preprocessing.
- Similar artwork, reprints, and variants may create ambiguous candidate sets.
- Stamp edge cases are not solved in Phase 1.
- Network latency to remote vector search may exceed the fast-path budget.
- Existing Phase 8 test results showed embeddings alone are not ready, so the verifier gate is mandatory.

Risk controls:

- Keep scope limited to ME sets.
- Require exact number and set agreement.
- Fall back on missing or ambiguous OCR.
- Log every decision reason.
- Treat any wrong instant match as a release blocker.
