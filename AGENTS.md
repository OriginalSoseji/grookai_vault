# Agent Working Practices

This repository uses “tasks” in code comments (e.g., TODO, FIXME, TASK) to capture fixes, shortcuts, and follow‑ups. To reduce time to resolution and avoid duplicating effort, always consult the task list before changing code.

## Golden Rule — Check Tasks First

- Before investigating an issue or making changes:
  - Search for existing tasks in the relevant area.
  - Prefer implementing/closing an existing task over adding new ad‑hoc code.
  - If a task is misleading or obsolete, update or remove it with a short rationale.

## How To Scan Quickly

- Use ripgrep to surface common markers (case‑insensitive):
  - `rg -n -S "(?i)\b(TODO|FIXME|HACK|TASK|NOTE)\b" --glob "!.git" --glob "!build"`
  - For a focused area: `rg -n -S "(?i)\b(TODO|FIXME|TASK)\b" lib/features/<area>`

- PowerShell helper (recommended):
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File tools/list_tasks.ps1`

## When Fixing Issues

- Cross‑reference any relevant tasks in your change summary.
- If a task exactly describes the fix you implement, delete it in the same change.
- If you partially address a task, update its wording to reflect what remains.

## Supabase Migrations

- Before authoring new migrations, scan existing migration SQL for TODO/TASK notes.
- If migration history mismatches the remote, use:
  - `supabase migration list`
  - `supabase migration repair --status [applied|reverted] <version>`
  - `supabase db pull` then `supabase db push`

## Flutter/UX Overflow

- For list items with dynamic text + trailing widgets, prefer:
  - `Expanded` around text, `maxLines: 1`, `overflow: TextOverflow.ellipsis`.
  - `ConstrainedBox` + `FittedBox` for trailing content to avoid overflows.

