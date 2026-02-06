# Fingerprinting L2 Audit Evidence

## Phase 0 — Repo baseline (C:\grookai_vault)

Command: `git status`
```
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	_AI_AUDIT_REPORT.md
	_audit_ai_backend_refs.txt
	_audit_ai_env_refs.txt
	_audit_ai_files.txt
	_audit_ai_grep.txt
	_audit_ai_supabase_functions.txt
	_audit_llm_backend.txt
	_audit_llm_calls.txt
	_audit_llm_features.txt
	_audit_llm_paths.txt
	_audit_llm_supabase.txt
	_audit_name_0.png
	_audit_name_180.png
	_audit_name_90ccw.png
	_audit_name_90cw.png
	_audit_name_box.png
	_audit_num_0.png
	_audit_num_180.png
	_audit_num_90ccw.png
	_audit_num_90cw.png
	_audit_num_box.png
	_audit_num_proc_0.png
	_audit_num_proc_180.png
	_audit_num_proc_90ccw.png
	_audit_num_proc_90cw.png
	_gv_name_roi_pick.png
	_gv_name_roi_run.png
	_gv_num_roi.png
	_gv_num_roi_miss1.png
	_gv_num_roi_miss2.png
	_gv_num_roi_miss3.png
	_gv_num_roi_pick.png
	_gv_num_roi_proc.png
	_gv_num_roi_proc_miss1.png
	_gv_num_roi_proc_miss2.png
	_gv_num_roi_proc_miss3.png
	_gv_num_roi_proc_pick.png
	_gv_num_roi_proc_run.png
	_gv_num_roi_run.png
	_gv_warp_final.png
	_gv_warp_final_after_fix.png
	_gv_warp_final_cardonly.png
	_gv_warp_final_inspect.png
	_gv_warp_final_latest.png
	_gv_warp_final_verified.png
	_gv_warp_pre_rotate.png
	_name_raw.png
	_num_proc.png
	_num_raw.png
	_tmp_front_pass.jpg
	app.py.aiwork
	app.py.vps
	app.py.vps2
	app.py.vps3
	app.py.vps4
	app.py.vps5
	app.py.vps6
	app.py.vps7
	gv_name_roi_20260201_080747_373342.png

nothing added to commit but untracked files present (use "git add" to track)
```

Command: `git rev-parse HEAD`
```
4e6f55c9f0491d6b8c8e00d5c53614e341cb6ea8
```

Command: `git describe --tags --always`
```
checkpoint-ai-identity-warp-v1
```

Command: `git log -1 --oneline`
```
4e6f55c Checkpoint: AI identity from warp V1 (vision + cache + auth) + ops doc
```

## Phase 1 — Surface inventory (ripgrep)

Command: `rg -n "fingerprint" -S .` (248 lines; excerpted key hits)
```
backend/condition/condition_analysis_job_runner_v1.mjs:190:function runFingerprintWorker(snapshotId) {
backend/condition/fingerprint_key_v1.mjs:5:export function deriveFingerprintKeyV1(measurements) {
backend/condition/fingerprint_worker_v1.mjs:10:import { computeDHash64, computePHash64, hamming64 } from './fingerprint_hashes_v1.mjs';
backend/condition/fingerprint_worker_v1.mjs:11:import { scoreMatch, decisionFromScore } from './fingerprint_match_v1.mjs';
backend/condition/fingerprint_worker_v1.mjs:383:  const analysisKey = sha256Hex(`${snapshotId}::${analysisVersion}::fingerprint_v1`);
backend/condition/fingerprint_worker_v1.mjs:645:        .from('fingerprint_bindings')
backend/condition/fingerprint_worker_v1.mjs:764:        await supabase.rpc('admin_fingerprint_bind_v1', {
backend/condition/fingerprint_worker_v1.mjs:772:        await supabase.rpc('admin_fingerprint_event_insert_v1', {
supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:4:-- === Table: public.fingerprint_bindings ===
supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql:4:create or replace function public.admin_fingerprint_bind_v1(
docs/contracts/FINGERPRINTING_BINDING_PROVENANCE_CONTRACT_V1.md:21:- fingerprint_key is derived ONLY from hashes ...
```

Command: `rg -n "fingerprint_bind" -S .`
```
backend/condition/fingerprint_worker_v1.mjs:645:        .from('fingerprint_bindings')
backend/condition/fingerprint_worker_v1.mjs:764:        await supabase.rpc('admin_fingerprint_bind_v1', {
supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:4:-- === Table: public.fingerprint_bindings ===
supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql:16:  insert into public.fingerprint_bindings (
```

Command: `rg -n "provenance" -S .`
```
supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:51:-- === Table: public.fingerprint_provenance_events ===
supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql:45:-- Insert provenance event (append-only, idempotent via unique constraint)
docs/contracts/FINGERPRINTING_BINDING_PROVENANCE_CONTRACT_V1.md:47:## 5) Provenance Ledger (Append-Only)
```

Command: `rg -n "provenance_events" -S .`
```
supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:51:-- === Table: public.fingerprint_provenance_events ===
docs/audits/identity_scanner_v1_phase0_db_audit.md:26:    TABLE "fingerprint_provenance_events" CONSTRAINT "fingerprint_provenance_events_snapshot_id_fkey" ...
```

Command: `rg -n "fingerprint_provenance" -S .`
```
supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:51:create table if not exists public.fingerprint_provenance_events (
supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:69:create index if not exists idx_fingerprint_prov_user_created on public.fingerprint_provenance_events (user_id, created_at desc);
supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql:60:  insert into public.fingerprint_provenance_events (
```

Command: `rg -n "condition_snapshots_insert_v1" -S .`
```
supabase/migrations/20251230045041_condition_snapshots_insert_rpc_v1.sql:8:create or replace function public.condition_snapshots_insert_v1(
lib/services/scanner/condition_scan_service.dart:150:      'condition_snapshots_insert_v1',
```

Command: `rg -n "scan-read|scan-upload-plan" -S .`
```
supabase/functions/scan-upload-plan/index.ts:41:    const supabaseUrl = Deno.env.get("SUPABASE_URL");
supabase/functions/scan-read/index.ts: (not opened; command output lists function path)
lib/services/scanner/condition_scan_service.dart:41:        'scan-upload-plan',
```

Command: `rg -n "binding" -S supabase backend lib`
```
backend/condition/fingerprint_worker_v1.mjs:645:        .from('fingerprint_bindings')
backend/condition/fingerprint_worker_v1.mjs:764:        await supabase.rpc('admin_fingerprint_bind_v1', {
supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:5:create table if not exists public.fingerprint_bindings (
supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql:4:create or replace function public.admin_fingerprint_bind_v1(
lib/main.dart:716:  WidgetsFlutterBinding.ensureInitialized();
```

## Phase 2 — Schema artifacts

Schema file lookup: `rg -n "fingerprint" supabase/schema/schema_local.sql`
```
rg: supabase/schema/schema_local.sql: IO error ... The system cannot find the path specified.
```
Result: `schema_local.sql` missing → schema evidence taken from migrations below.

Excerpt: `supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql`
```
create table if not exists public.fingerprint_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint_key text not null,
  vault_item_id uuid not null references public.vault_items(id) on delete restrict,
  snapshot_id uuid not null references public.condition_snapshots(id) on delete restrict,
  analysis_key text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint fingerprint_bindings_user_key_unique unique (user_id, fingerprint_key)
);
...
create table if not exists public.fingerprint_provenance_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vault_item_id uuid null references public.vault_items(id) on delete restrict,
  snapshot_id uuid not null references public.condition_snapshots(id) on delete restrict,
  analysis_key text not null,
  fingerprint_key text null,
  event_type text not null,
  event_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fingerprint_prov_events_user_analysis_event_unique unique (user_id, analysis_key, event_type)
);
```

Excerpt: `supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql`
```
create or replace function public.admin_fingerprint_bind_v1(
  p_user_id uuid,
  p_fingerprint_key text,
  p_vault_item_id uuid,
  p_snapshot_id uuid,
  p_analysis_key text
) returns void
language plpgsql
security definer
...
  insert into public.fingerprint_bindings (...) values (...) 
  on conflict (user_id, fingerprint_key) do update
    set vault_item_id = excluded.vault_item_id,
        snapshot_id   = excluded.snapshot_id,
        analysis_key  = excluded.analysis_key,
        last_seen_at  = now();
...
create or replace function public.admin_fingerprint_event_insert_v1(
  p_user_id uuid,
  p_analysis_key text,
  p_event_type text,
  p_snapshot_id uuid,
  p_fingerprint_key text default null,
  p_vault_item_id uuid default null,
  p_event_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
...
  insert into public.fingerprint_provenance_events (...) values (...) 
  on conflict (user_id, analysis_key, event_type) do nothing;
```

Excerpt: `supabase/migrations/20251229214410_condition_snapshots_phase0_init.sql`
```
create table if not exists public.condition_snapshots (
  id uuid primary key default gen_random_uuid(),
  vault_item_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  images jsonb not null,
  scan_quality jsonb not null,
  measurements jsonb not null,
  defects jsonb not null,
  confidence numeric not null,
  device_meta jsonb null,
  fingerprint_id uuid null,
  card_print_id uuid null
);
```

Excerpt: `supabase/migrations/20251230045041_condition_snapshots_insert_rpc_v1.sql`
```
create or replace function public.condition_snapshots_insert_v1(
  p_id uuid,
  p_vault_item_id uuid,
  p_images jsonb,
  ...
  p_fingerprint_id uuid default null,
  p_card_print_id uuid default null
) returns uuid
security definer
as $$
  v_uid := auth.uid();
  insert into public.condition_snapshots (
    id, vault_item_id, user_id, created_at, images, scan_quality, measurements,
    defects, confidence, device_meta, fingerprint_id, card_print_id
  ) values (...);
$$;
```

Excerpt: `supabase/migrations/20251230070000_condition_snapshot_analyses_tables_v1.sql`
```
create table if not exists public.condition_snapshot_analyses (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.condition_snapshots(id) on delete restrict,
  user_id uuid not null,
  analysis_version text not null,
  analysis_key text not null,
  scan_quality jsonb not null,
  measurements jsonb not null,
  defects jsonb not null,
  confidence numeric not null,
  created_at timestamptz not null default now(),
  constraint condition_snapshot_analyses_snapshot_version_key unique (snapshot_id, analysis_version, analysis_key)
);
```

## Phase 3 — DB reality (Supabase pg via node/pg)

Command:
```
$env:SUPABASE_DB_URL='postgresql://postgres:D4tFdTW3JVm4LcA1@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres'; @'
const { Client } = require('pg');
const conn = process.env.SUPABASE_DB_URL;
(async () => {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const queries = [
    { name: 'exists_fingerprint_bindings', sql: "select to_regclass('public.fingerprint_bindings') as fingerprint_bindings;" },
    { name: 'count_fingerprint_bindings', sql: "select count(*) as bindings_count from public.fingerprint_bindings;" },
    { name: 'exists_fingerprint_provenance_events', sql: "select to_regclass('public.fingerprint_provenance_events') as fingerprint_provenance_events;" },
    { name: 'count_fingerprint_provenance_events', sql: "select count(*) as prov_count from public.fingerprint_provenance_events;" },
    { name: 'recent_bindings', sql: "select * from public.fingerprint_bindings order by created_at desc nulls last limit 5;" },
    { name: 'recent_provenance', sql: "select * from public.fingerprint_provenance_events order by created_at desc nulls last limit 10;" },
    { name: 'fk_refs', sql: `select
  tc.table_schema, tc.table_name, kcu.column_name,
  ccu.table_name as foreign_table_name, ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and (ccu.table_name in ('fingerprint_bindings','fingerprint_provenance_events'));` },
    { name: 'functions_fp_prov', sql: `select n.nspname as schema, p.proname as name
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.proname ilike '%fingerprint%' or p.proname ilike '%provenance%'
order by 1,2;` },
    { name: 'views_fp_prov', sql: `select schemaname, viewname
from pg_views
where viewname ilike '%fingerprint%' or viewname ilike '%provenance%'
order by 1,2;` },
  ];
  for (const q of queries) {
    const res = await client.query(q.sql);
    console.log('--- ' + q.name + ' ---');
    console.log(JSON.stringify(res.rows, null, 2));
  }
  await client.end();
})().catch((err) => { console.error('DB_ERROR', err); process.exit(1); });
'@ | node -
```

Outputs:
```
--- exists_fingerprint_bindings ---
[
  {
    "fingerprint_bindings": "fingerprint_bindings"
  }
]
--- count_fingerprint_bindings ---
[
  {
    "bindings_count": "1"
  }
]
--- exists_fingerprint_provenance_events ---
[
  {
    "fingerprint_provenance_events": "fingerprint_provenance_events"
  }
]
--- count_fingerprint_provenance_events ---
[
  {
    "prov_count": "2"
  }
]
--- recent_bindings ---
[
  {
    "id": "e1946780-0f1e-4275-950f-dbc75bfc427e",
    "user_id": "03e80d15-a2bb-4d3c-abd1-2de03e55787b",
    "fingerprint_key": "fpv1:fb:f=bd20d79ad625682a.d8330f0f2b2b7662;b=8300ec1fb163dd0f.ffa5c0ccfc3c09c2",
    "vault_item_id": "7f042632-efc6-44a1-ba42-3046d10602c4",
    "snapshot_id": "bfd50b7e-459e-47bd-b717-aef4f766d705",
    "analysis_key": "010a12427bdf23829b4d446cba913f6253fd50541da43bbf7b7804d249ece1ae",
    "last_seen_at": "2026-01-17T06:35:20.932Z",
    "created_at": "2026-01-17T06:35:20.932Z"
  }
]
--- recent_provenance ---
[
  {
    "id": "90134c73-1b7b-4731-b572-c0473b7b67cb",
    "user_id": "03e80d15-a2bb-4d3c-abd1-2de03e55787b",
    "vault_item_id": "7f042632-efc6-44a1-ba42-3046d10602c4",
    "snapshot_id": "bfd50b7e-459e-47bd-b717-aef4f766d705",
    "analysis_key": "010a12427bdf23829b4d446cba913f6253fd50541da43bbf7b7804d249ece1ae",
    "fingerprint_key": "fpv1:fb:f=bd20d79ad625682a.d8330f0f2b2b7662;b=8300ec1fb163dd0f.ffa5c0ccfc3c09c2",
    "event_type": "fingerprint_bound_to_vault_item",
    "event_metadata": {
      "score": 0,
      "best_candidate_snapshot_id": null
    },
    "created_at": "2026-01-17T06:35:21.216Z"
  },
  {
    "id": "6c6a3b24-e06a-43e4-ac0a-6b8335d7b125",
    "user_id": "03e80d15-a2bb-4d3c-abd1-2de03e55787b",
    "vault_item_id": "7f042632-efc6-44a1-ba42-3046d10602c4",
    "snapshot_id": "bfd50b7e-459e-47bd-b717-aef4f766d705",
    "analysis_key": "010a12427bdf23829b4d446cba913f6253fd50541da43bbf7b7804d249ece1ae",
    "fingerprint_key": "fpv1:fb:f=bd20d79ad625682a.d8330f0f2b2b7662;b=8300ec1fb163dd0f.ffa5c0ccfc3c09c2",
    "event_type": "fingerprint_created",
    "event_metadata": {
      "score": 0,
      "best_candidate_snapshot_id": null
    },
    "created_at": "2026-01-17T06:35:20.633Z"
  }
]
--- fk_refs ---
[]
--- functions_fp_prov ---
[
  {
    "schema": "public",
    "name": "admin_fingerprint_bind_v1"
  },
  {
    "schema": "public",
    "name": "admin_fingerprint_event_insert_v1"
  }
]
--- views_fp_prov ---
[]
```
