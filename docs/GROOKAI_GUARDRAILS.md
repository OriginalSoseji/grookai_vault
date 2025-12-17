# 🧱 GROOKAI VAULT — GUARDRAILS (AUTHORITATIVE)

This document defines the **non-negotiable guardrails** for Grookai Vault.
If any guardrail is triggered, forward progress MUST STOP and an audit MUST begin.

This file exists to prevent regression, drift, and assumption-driven damage.

---

## 1️⃣ NO-ASSUMPTION RULE (GLOBAL)

No work may proceed based on assumptions.

Before making changes, the following MUST be proven with real data:

1. Current schema state  
2. Actual rows involved  
3. Exact data shapes  
4. Verified constraints  
5. Proven scope of impact  

If any of the above is unknown:  
→ **STOP**  
→ Run an audit  
→ Do not proceed  

---

## 2️⃣ IDENTITY IS SACRED

Identity rules are frozen and may not be altered casually.

### Identity precedence:
1. Printed physical identity  
2. Canonical set_code (grouping only)  
3. External mappings (tertiary)  

Violations include:
- Duplicate card_prints for the same physical card  
- Ghost rows controlling identity  
- Aliases treated as canonical  
- Images attached to non-canonical rows  

Any identity inconsistency:  
→ **STOP**  
→ Identity Audit required  

---

## 3️⃣ SPECIAL SETS (`.5`, SPLITS, PROMOS)

Special sets (e.g. `.5`, split releases, promos) are **high-risk**.

Rules:
- No Printed Identity work without explicit approval  
- No ingestion without classification  
- No guessing printed totals  
- No retroactive canon changes  

If touching a special set:  
→ **STOP**  
→ Run Special Set Audit Checklist  

---

## 4️⃣ MIGRATIONS ARE DANGEROUS

Rules:
- No `supabase db push --include-all` on prod  
- Legacy stubs are receipts only  
- All migrations must be forward-only  
- Schema must replay from zero cleanly  

If a migration behaves unexpectedly:  
→ **STOP**  
→ Do not “try again”  
→ Investigate migration history first  

---

## 5️⃣ WORKERS REQUIRE PREFLIGHT

Any worker that:
- Writes to canonical tables  
- Modifies identity  
- Moves images  
- Alters pricing data  

Must pass preflight checks.

If preflight cannot prove safety:  
→ **STOP**  
→ Worker may not run  

---

## 6️⃣ FREEZE DECLARATIONS ARE BINDING

When a system is declared frozen:
- It may not be modified  
- It may not be extended  
- It may not be reused for new scopes  

Breaking a freeze is treated as a defect, not iteration.

---

## 7️⃣ WHEN IN DOUBT

Default action is always:  
→ **STOP**  
→ Audit  
→ Verify  
→ Then act  

Speed is never more important than correctness.
