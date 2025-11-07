This folder is used by scripts/diagnostics/finish_option_a.ps1 to coordinate migration repairs.

Files
- remote_versions.txt — ordered, de‑duplicated list of migration IDs the CLI suggested marking as `reverted`.

How it works
- The orchestrator runs `supabase db pull`, captures stderr/stdout to a log,
  and parses lines like `supabase migration repair --status reverted <ID>`.
- It writes the collected <ID> values to `remote_versions.txt`.
- It then applies these repairs in small batches, with short delays between batches to reduce temp‑role churn.

You can safely delete this folder; the orchestrator will recreate it as needed.

