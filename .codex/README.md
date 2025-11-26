## Rulebook Requirement

All Codex tasks must consult `docs/GROOKAI_RULEBOOK.md` before making changes. This rulebook consolidates every contract, guardrail, and workflow for Grookai Vault, and Codex must treat it as authoritative guidance on migrations, backend architecture, ingestion, pricing, environments, secrets, and forbidden moves.

For any Audit Rule (L1/L2/L3) that touches Supabase data, include the mandatory “Env / DB Sanity” step from the rulebook: verify Flutter and Supabase CLI point to the same project ref and confirm `card_prints`/`v_vault_items` counts on that project; if counts are zero/wrong, the audit must be marked blocked until routing is fixed.
