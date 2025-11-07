## Ship: Wall Feed (zero-touch)

This script logs in, links, repairs drift, pushes the wall-feed migration with hardened retries, then inspects, seeds, and verifies — no manual steps during execution.

### Zero‑touch setup (.env)

Add these to `.env` (values from your Supabase Dashboard):

```
SUPABASE_ACCESS_TOKEN=***              # personal access token
SUPABASE_PROJECT_REF=ycdxbpibncqcchqiihfz
SUPABASE_URL=https://ycdxbpibncqcchqiihfz.supabase.co
SUPABASE_DB_URL=postgres://postgres.ycdxbpibncqcchqiihfz:...@aws-1-us-east-2.pooler.supabase.com:5432/postgres?options=project%3Dycdxbpibncqcchqiihfz
SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***
```

If any are missing at runtime, the script prints a single instruction and exits.

### Run it

- VS Code → Tasks → `Ship: Wall Feed (zero-touch)`

Artifacts and logs are written under `scripts/diagnostics/output/` with timestamps.

### What success looks like

- `wall_feed_inspect.md` shows the view (`public.wall_feed_v`) and function (`public.wall_feed_list`) exist with anon/auth grants
- `seed_wall_photos_<ts>.log` shows source=VIEW/RPC/LISTINGS_FALLBACK and Updated/Skipped counts
- `wall_feed_verification.md` shows 200s for both REST endpoints and sample `thumb_url`

### If it fails

Open the latest logs mentioned in the task output:

- `db_preflight_*.log`: DNS/TCP probe and optional psql test
- `db_push_*.log`: annotated retries with `--debug`

Common annotations and actions:

- `secret format/token drift` → refresh `SUPABASE_ACCESS_TOKEN` / DB password (Dashboard) and re‑login
- `auth failure (password/JWT)` → incorrect DB password or JWT
- `pooler handshake/timeout` → transient; re‑run the task

Re‑run the task after adjusting `.env`.

### CLI Profile

This script forces `--profile supabase` for all CLI calls and removes any stray `supabase/.temp/profile` before running to avoid Windows path/profile edge cases.
