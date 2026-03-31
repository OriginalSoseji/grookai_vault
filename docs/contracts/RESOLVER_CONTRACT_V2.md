# RESOLVER CONTRACT V2

Status: ACTIVE  
Scope: Governs all resolver behavior for Grookai Vault

---

## PURPOSE

The resolver converts collector input into canonical card identity.

It must:
- maximize correct retrieval
- preserve identity truth
- prevent false certainty
- remain deterministic

---

## CORE PIPELINE (LOCKED)

All resolver execution MUST follow:

1. Normalize input
2. Extract structured intent
3. Retrieve candidates with scope
4. Rank candidates
5. Resolve decision

No stage may be skipped.

---

## NORMALIZATION RULES

Allowed:
- case normalization
- punctuation cleanup
- bounded nickname expansion
- bounded set alias expansion

Forbidden:
- fuzzy expansion without explicit bounds
- AI interpretation
- probabilistic rewriting

---

## SET INTENT RULE

Set intent MUST:
- be derived from normalized tokens
- map to existing set identity through existing columns and existing set metadata
- feed BOTH:
  - direct resolver
  - ranked retrieval scope

If set intent exists:
- candidate retrieval MUST include `expectedSetCodes`
- ranked candidate pools MUST be filtered to those expected set codes before final ranking

---

## NICKNAME RULE

Nickname expansion:
- must be explicit
- must be bounded
- must be centrally defined
- must NOT override ambiguity

Examples:
- `pika -> pikachu`
- `zard -> charizard`

Nickname expansion is retrieval aid only. It must not create direct certainty by itself.

---

## RETRIEVAL RULE

Candidate retrieval MUST:
- include `expectedSetCodes` when present
- use existing searchable identity columns only, including:
  - `name`
  - `set_code`
  - `printed_set_abbrev`
  - `number`
- never rely on ranking alone to fix a bad candidate pool

---

## RANKING RULE

Ranking must prioritize:

1. exact structured identity evidence
2. name + set agreement
3. name agreement
4. number / fraction agreement
5. bounded fallback relevance

Ranking must NOT:
- force resolution from weak evidence
- hide real ambiguity

---

## RESOLUTION STATES (LOCKED)

Resolver may return ONLY:

- `DIRECT_MATCH`
- `AMBIGUOUS_MATCH`
- `WEAK_MATCH`
- `NO_MATCH`

---

## AUTO-RESOLVE RULE

Auto-resolve ONLY when:
- a direct GV / structured collector / lawful set-intent match exists
- or future deterministic thresholds are explicitly added under contract

Exact-name-only hits must not auto-resolve by themselves.

Otherwise:
- remain `AMBIGUOUS_MATCH` or `WEAK_MATCH`

---

## ROUTING CONTRACT

Routing MUST respect resolver state:

If `resolverState !== DIRECT_MATCH`:
- do not redirect to a single card or set
- show ranked search results instead

The redirect gate is enforced in the live `/search` route.

---

## FORBIDDEN BEHAVIOR

- forcing resolution from weak signals
- bypassing structured intent
- ignoring set scope when set intent exists
- adding hidden heuristics
- duplicating resolver logic across surfaces

---

## INVARIANTS

- the database remains the identity source of truth
- the resolver remains deterministic
- ambiguity is preserved when it is real
- shorthand improves retrieval, not certainty
- existing columns and existing resolver architecture remain authoritative

---

## RESULT

Grookai resolver remains:
- reliable
- predictable
- explainable
- collector-aligned
