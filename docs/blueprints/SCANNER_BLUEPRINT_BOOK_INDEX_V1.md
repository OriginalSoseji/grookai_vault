# SCANNER BLUEPRINT BOOK V1

**Status:** LOCKED — SCANNER BLUEPRINT BOOK V1  
**Authority:** Normative. Conflicts are resolved in favor of this book.  
**Amendments:** Any change requires a versioned amendment: `SCANNER_BLUEPRINT_BOOK_AMENDMENT_V2.md` (or higher).  
**Execution Rule:** Single Active Step. Audit → Contract → Dry-Run → Apply → Verify → Checkpoint.

---

## 0.1 Purpose

This Blueprint Book is the single source of truth for finishing Grookai Vault’s scanner system end-to-end with **zero drift**. It defines two scanners (Condition Assist + Identify-only), shared capture primitives, commit boundaries (Write Gate), measurement intelligence steps, proof harnesses, and completion gates.

Every future scanner-related change must cite:

* the active Step ID
* the governing contract(s)
* the proof plan used to verify success

---

## 0.2 The Two-Scanner System

### Scanner A — Condition Assist Scanner (Write Path)

**Goal:** Create immutable scan snapshots, run measurement workers (centering/edges/corners/surface), and surface append-only condition history.

**Writes:**

* Supabase Storage bucket: `condition-scans`
* `public.condition_snapshots` (append-only)
* `public.condition_snapshot_analyses` (append-only)
* Read view: `public.v_condition_snapshot_latest_analysis`

### Scanner B — Identify-Only Scanner (No-Write Path)

**Goal:** Identify card/print quickly without persistence.

**Writes:** NONE (no storage uploads, no DB inserts, no snapshots).  
**Reads:** Catalog / search endpoints / RPCs.  
**Promotion boundary:** Explicit user action ("Add to Vault" / "Start Condition Scan") re-enters write pipeline under Write Gate.

---

## 0.3 Governance Rules (No Drift)

### 0.3.1 Single Active Step Rule

Only one Step ID is active at a time. No “while we’re here” changes.

### 0.3.2 Execution Protocol

Every step executes:  
**Audit → Contract → Dry-Run → Apply → Verify → Checkpoint**

### 0.3.3 Hard Stop Gate

If any proof output contradicts expectations:  
🚨 **BUG FOUND** → stop forward progress → open a dedicated bug fork.

### 0.3.4 Authority Hierarchy

1. Blueprint Book
2. Contract documents
3. Runbooks / Playbooks
4. Implementation code

If code contradicts contract → code is wrong.

---

## 0.4 Existing Artifacts (Already Completed; Do Not Rebuild)

These exist and must be referenced, not re-suggested:

* Edge Functions deployed: `scan-upload-plan`, `scan-read`
* JWT incident solved; playbook exists: `JWT_INVALID_EDGE_FUNCTIONS_PLAYBOOK_V1`
* Config precedence fixed: `supabase/config.toml` sets `verify_jwt=false` for `scan-upload-plan` and `scan-read`
* Condition Measurement foundation locked: `CONDITION_MEASUREMENT_CONTRACT_V1`
* Centering V2 contract exists: `CENTERING_MEASUREMENT_CONTRACT_V2` (DRAFT until tuned)
* Centering worker exists and verified against real snapshot: `centering_measurement_worker_v2.mjs`
* View is authoritative for results: `v_condition_snapshot_latest_analysis`

---

## 0.5 Step Map (Ordered Execution)

### Phase A — Finish Condition Scanner Loop (must complete first)

* **A1:** Condition Analysis Trigger V1 (auto-run measurement after snapshot insert)
* **A2:** Condition Results Binding V1 (real results, signed URLs, poll)
* **A3:** Condition History UI V1 (append-only trust surface)

### Phase B — Expand Measurement Intelligence (after Phase A)

* **B1:** Edges Measurement V2
* **B2:** Corners Measurement V2
* **B3:** Surface Measurement V2

### Phase C — Identify-Only Scanner (after Phase A)

* **C1:** Identify Request V1 (no writes)
* **C2:** Identify Results V1
* **C3:** Promote-to-Write V1 (explicit Write Gate)

### Phase D — Stability & Scale Hardening

* Replay harness, drift bounds, orchestration/queue policies, kill switches.

---

## 0.6 Resume Phrase Standard (Mandatory)

Every new session starts with:

> Resume from SCANNER_BLUEPRINT_BOOK_INDEX_V1 — Step <ID>: <NAME>. Mode: Audit→Contract→Dry-Run→Apply→Verify.

---

## 0.7 Proof Harness Standard (Mandatory)

Each contract must include:

* PowerShell commands (Windows-first)
* SQL proof queries
* Expected outputs
* Hard stop conditions and bug fork guidance

---

## 0.8 Checkpoint Format (Mandatory)

Every completed step records:

* Step ID + name
* Artifacts touched
* Proof outputs (SQL rows, command outputs)
* Known limitations
* Next unlocked step

---

## 0.9 Appendices (Normative)

* Appendix A — Naming Conventions: `APPENDIX_NAMING_CONVENTIONS_V1.md`
* Appendix B — Scope & Authority Guardrails: `APPENDIX_SCOPE_AUTHORITY_GUARDRAILS_V1.md`
* Appendix C — Ownership Matrix: `APPENDIX_OWNERSHIP_MATRIX_V1.md`
* Appendix D — Contract Violation Taxonomy: `APPENDIX_CONTRACT_VIOLATION_TAXONOMY_V1.md`
* Appendix E — No Implicit Magic: `APPENDIX_NO_IMPLICIT_MAGIC_V1.md`
* Appendix F — Time Semantics: `APPENDIX_TIME_SEMANTICS_V1.md`
* Appendix G — Auditability: `APPENDIX_AUDITABILITY_V1.md`
* Appendix H — Blueprint Amendments: `APPENDIX_BLUEPRINT_AMENDMENTS_V1.md`
* Appendix I — Kill Switch: `APPENDIX_KILL_SWITCH_V1.md`
* Appendix J — Non-Goals: `APPENDIX_NON_GOALS_V1.md`

---

## 0.10 Chapters (Normative)

* Chapter 1 — Shared Foundations: `SCANNER_BLUEPRINT_CHAPTER_1_SHARED_FOUNDATIONS_V1.md`
* Chapter 2 — Condition Scanner: `SCANNER_BLUEPRINT_CHAPTER_2_CONDITION_SCANNER_V1.md`
* Chapter 3 — Identify Scanner: `SCANNER_BLUEPRINT_CHAPTER_3_IDENTIFY_SCANNER_V1.md`
* Chapter 4 — Proof Harness & Runbooks: `SCANNER_BLUEPRINT_CHAPTER_4_PROOF_HARNESS_RUNBOOKS_V1.md`
* Chapter 5 — Completion Gates: `SCANNER_COMPLETION_GATES_V1.md`
