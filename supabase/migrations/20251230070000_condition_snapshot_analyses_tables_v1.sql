-- CONDITION_ASSIST_V1 Phase 1: analysis tables and view
-- Creates append-only analysis tables and latest analysis view.

-- 1) condition_snapshot_analyses (append-only)
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

create index if not exists condition_snapshot_analyses_snapshot_created_idx
  on public.condition_snapshot_analyses (snapshot_id, created_at desc);
create index if not exists condition_snapshot_analyses_user_created_idx
  on public.condition_snapshot_analyses (user_id, created_at desc);

-- 2) condition_analysis_failures (append-only)
create table if not exists public.condition_analysis_failures (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid references public.condition_snapshots(id) on delete restrict,
  user_id uuid,
  analysis_version text not null,
  analysis_key text,
  error_code text not null,
  error_detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists condition_analysis_failures_snapshot_created_idx
  on public.condition_analysis_failures (snapshot_id, created_at desc);
create index if not exists condition_analysis_failures_user_created_idx
  on public.condition_analysis_failures (user_id, created_at desc);

-- 3) Latest analysis view (deterministic)
create or replace view public.v_condition_snapshot_latest_analysis as
select distinct on (a.snapshot_id)
  a.snapshot_id,
  a.analysis_version,
  a.analysis_key,
  a.scan_quality,
  a.measurements,
  a.defects,
  a.confidence,
  a.created_at
from public.condition_snapshot_analyses a
order by a.snapshot_id, a.created_at desc, a.id desc;
