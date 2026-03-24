# CODEX_GUARDRAILS_CONTRACT_V1

Status: ACTIVE • Locked • Applies to all Codex prompts

## Purpose
Prevent drift and dangerous automation in Codex-assisted workflows, especially around migrations, staging, and scope control, even when instructions are ambiguous or unsafe.

## Definitions
- Applied Migration: Any migration listed as applied in `supabase migration list` on the target environment.
- Forward-only repair: Creating a new migration to fix prior state; never editing applied migrations.
- Scope: The explicitly requested files/areas in the current prompt.
- Proceed Token: User-provided explicit “PROCEED” authorization to move from audit to apply in high-risk domains.
- Audit Phase: Read/report-only phase; no changes.
- Apply Phase: Executing changes after audit and explicit proceed.

## Guardrails (Hard Stops)

1) Migration Immutability Gate (HARD STOP)
- Before any change in `supabase/migrations`:
  - Run `supabase migration list`.
  - Determine latest remote-applied migration timestamp.
  - Refuse to modify/rename/delete any migration whose timestamp <= latest remote timestamp.
  - Stop message: “🚨 STOP — Attempt to modify applied migration. Forward-only repair required.”

2) Duplicate Timestamp Gate (HARD STOP)
- If two files share the same leading timestamp prefix:
  - STOP and require quarantine/removal of the non-stub/snapshot file from migrations folder.
  - Do not proceed with DB push until resolved.

3) DB Push Ordering Gate (HARD STOP)
- Before `supabase db push`:
  - Confirm `supabase migration list` shows no remote-only migrations and no duplicate timestamps.
  - Confirm only expected local-only migrations are pending.
  - If “inserted before last remote migration” appears, STOP and run ledger reconciliation; never use `--include-all`.

4) Scope Staging Gate (HARD STOP)
- Before staging/commit:
  - Run `git status` and enumerate changes.
  - Stage only explicit allowlist paths provided in the prompt.
  - If build artifacts are present (.next, cache, tmp dumps), add ignore rules and refuse to stage them.
  - If unrelated modified files exist, prompt the user; default is EXCLUDE.

5) Two-Phase Execution Gate (AUDIT → APPLY)
- For high-risk domains (migrations, RLS, auth, pricing, identity, workers touching prod):
  - Phase A: Audit-only report (no changes).
  - Requires explicit user token: “PROCEED” to enter Phase B apply.
  - If token absent: STOP after audit.

6) Migration Workflow Gate (HARD STOP)
- Migration tasks must follow: `Audit → Classify → Plan → Apply → Verify`.
- Before schema work begins:
  - Run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema`.
- Before remote schema apply:
  - Run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <ids>`.
- If strict preflight fails or `supabase db reset --local` fails: STOP.

7) Remote/Local Target Gate (HARD STOP)
- Any command that can hit remote must print the target:
  - SUPABASE_URL (or local URL) and explicitly state “REMOTE” or “LOCAL”.
  - If ambiguous: STOP and ask for target.

8) Secrets Hygiene Gate (HARD STOP)
- Never print secret keys in logs or repo files.
- Do not advise using service role keys in browser contexts.

9) Contract Creation Gate (HARD STOP)
- Any new contract requires:
  - Search for existing contract.
  - Update CONTRACT_INDEX.md.
  - Create repo file.
- Refuse to create if duplicate scope/name exists.

## Mandatory Stop Phrases
- “🚨 STOP — Attempt to modify applied migration. Forward-only repair required.”
- “STOP: duplicate timestamp in migrations; quarantine required.”
- “STOP: high-risk domain requires PROCEED token to apply.”
- “STOP: target (REMOTE/LOCAL) ambiguous.”

## Compliance Checklist (run at top of high-risk prompts)
- Migration list reviewed; no applied migration edits planned.
- Duplicate timestamps: none.
- Target declared (REMOTE/LOCAL) with SUPABASE_URL.
- Migration workflow confirmed: Audit → Classify → Plan → Apply → Verify.
- Strict preflight planned or completed for schema work.
- Scope allowlist confirmed; build artifacts excluded.
- Two-phase gate: audit vs apply; PROCEED token checked (if required).
- Secrets hygiene affirmed (no key leakage).

Lock Statement: This contract is binding. Any exception requires a new contract amendment.
