# 🔍 SPECIAL SET PRE-RECON AUDIT — `.5` CLOSURE (PHASE A)

**Date:** 2025-12-17  
**Scope:** Pokémon special/split sets (`.5`)  
**Mode:** Read-only (no writes)  
**Purpose:** Prove current state before reconstruction

---

## 1) Authoritative Inputs (Docs/Contracts)

- Contracts referenced: `docs/CONTRACT_INDEX.md` (Special `.5` sets closed; identity precedence; printed identity contracts), `docs/GROOKAI_GUARDRAILS.md` (stop rules), `docs/PREFLIGHT_GATE_V1.md` (mechanical gate).
- Docs referenced: `docs/SPECIAL_SET_IDENTITY_RECONSTRUCTION_V1.md`, `docs/SPECIAL_SET_RECONSTRUCTION_CONTRACT_V1.md`, `docs/PRINTED_SET_METADATA_PASS_V1.md`.
- Missing artifacts: None noted for listing the `.5` sets; readiness verification for promos/variants is outside scope.

---

## 2) `.5` / Special Set List

- Authoritative list: `sv08.5` (Prismatic Evolutions), `sv10.5b` (Black Bolt), `sv10.5w` (White Flare).

---

## 3) Evidence Queries

- Tooling: Node + Supabase backend client (read-only selects). Command run:
  - `node -e "import './backend/env.mjs'; import { createBackendClient } from './backend/supabase_backend_client.mjs'; const supabase=createBackendClient(); const sets=['sv08.5','sv10.5b','sv10.5w']; (async()=>{const results={}; for(const code of sets){const rc=await supabase.from('v_special_set_raw_counts').select('*').eq('set_code',code).maybeSingle(); const prints=await supabase.from('card_prints').select('id',{count:'exact',head:true}).eq('set_code',code); results[code]={raw_counts:rc.data, raw_error:rc.error?.message, card_prints:prints.count, prints_error:prints.error?.message};} console.log(JSON.stringify(results,null,2)); const gate=await supabase.from('v_special_set_reconstruction_gate').select('*'); console.log('gate', JSON.stringify(gate.data || gate.error?.message,null,2)); process.exit(0); })().catch(e=>{console.error(e); process.exit(1);});"`  
- Views used: `public.v_special_set_raw_counts`, `public.v_special_set_reconstruction_gate`.

---

## 4) Per-Set Matrix (Evidence)

| set_code | printed_total_known | printed_total_value | raw_tcgdex | raw_pokemonapi | prints_in_db | overflow | underflow | notes |
|---|---|---|---|---|---|---|---|---|
| sv08.5 | true | 131 (pokemonapi_printed_total) | 180 | 0 | 0 | true | false | Gate PASS; tcgdex-only raw; overflow relative to printed_total. |
| sv10.5b | true | 86 (pokemonapi_printed_total) | 172 | 0 | 46 | true | false | Gate PASS; tcgdex-only raw; overflow; fork_codes includes sv10.5b (self). |
| sv10.5w | true | 86 (pokemonapi_printed_total) | 173 | 0 | 0 | true | false | Gate PASS; tcgdex-only raw; overflow relative to printed_total. |

Gate output (summary): classification_present=true, raw_present=true, printed_total_known=true, fork_detected=false for sv08.5/sv10.5w, fork_detected=false (self-only fork_codes) for sv10.5b; all status=PASS.

---

## 5) Readiness Classification (Per Set)

| set_code | readiness | reason (evidence-based) |
|---|---|---|
| sv08.5 | REQUIRES_EXCEPTION_RULES | Overflow (180 raw vs printed_total 131); tcgdex-only raw; gate PASS but needs explicit overflow handling before reconstruction. |
| sv10.5b | REQUIRES_EXCEPTION_RULES | Overflow (172 raw vs printed_total 86); tcgdex-only raw; fork_codes self-only; gate PASS; needs overflow handling. |
| sv10.5w | REQUIRES_EXCEPTION_RULES | Overflow (173 raw vs printed_total 86); tcgdex-only raw; gate PASS; needs overflow handling. |

---

## 6) Conclusion

Phase B reconstruction may proceed only with explicit overflow exception rules for all `.5` sets (sv08.5, sv10.5b, sv10.5w). No other sets are ready without exceptions; printed totals are known but raw counts exceed printed totals. No fixes performed in this audit.
