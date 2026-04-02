# JUSTTCG_CANONIZATION_CONTRACT_V2

Status: DRAFT  
Type: Canonization Contract (Controlled)  
Scope: Defines rules for limited auto-canon creation from JustTCG

---

# 1. PURPOSE

Enable Grookai to safely:

→ create canonical rows from JustTCG data  
→ only under deterministic, high-confidence conditions  

This contract extends:

JUSTTCG_CANONIZATION_PROPOSAL_V1

---

# 2. CORE PRINCIPLE

JustTCG is NOT identity authority.

Grookai MAY accept JustTCG data into canon ONLY when:

→ identity is provable  
→ ambiguity is zero  

---

# 3. ALLOWED PATH

JustTCG → normalize → evaluate → (auto-create OR warehouse)

---

# 4. AUTO-CANONIZATION RULE (STRICT)

A JustTCG card may create a canonical row ONLY if ALL conditions are met:

### 4.1 Required Fields

- game is supported
- set is resolvable to known or approved set
- number is present
- name is present

---

### 4.2 Deterministic Identity Proof

ONE of the following must be true:

A) tcgplayerId exists AND maps uniquely to no existing canonical row  
B) (set + number + name) produces ZERO matches in card_prints  
   AND structure is consistent with canonical patterns  

---

### 4.3 No Conflicts

- no existing canonical row with same identity
- no multiple candidate matches
- no ambiguity in variant vs canonical boundary

---

### 4.4 Identity Stability Check

Reject if:

- naming appears synthetic or inconsistent
- set cannot be normalized deterministically
- number format is malformed

---

# 5. FORCED WAREHOUSE CONDITIONS

MUST NOT auto-create if:

- multiple matches exist
- identity boundary unclear (variant vs canonical)
- conflicting external mappings
- missing tcgplayerId AND weak structural match

---

# 6. APPLY BEHAVIOR

When AUTO-CREATE triggers:

- create new card_prints row
- generate GV-ID from printed identity
- insert mappings:
  - justtcg cardId
  - tcgplayerId (if present)

---

# 7. PRICING BEHAVIOR

Variants ALWAYS:

→ flow into pricing domain  
→ NEVER define canonical identity  

---

# 8. SAFETY GUARANTEES

This contract preserves:

- Grookai identity authority
- deterministic canon rules
- separation of identity vs pricing

---

# 9. NON-GOALS

This contract does NOT:

- trust JustTCG blindly
- allow fuzzy matching
- allow partial identity inference

---

# 10. RESULT

Grookai gains:

- controlled auto-expansion of canon
- faster coverage growth
- zero-loss identity guarantees

---

# 11. FINAL PRINCIPLE

JustTCG can create canon  
ONLY when Grookai can prove it.
