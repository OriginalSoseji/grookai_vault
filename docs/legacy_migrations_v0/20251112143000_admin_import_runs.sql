-- Create admin.import_runs table and supporting indexes
create schema if not exists admin;

create table if not exists admin.import_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null, -- e.g., 'pipeline_test' | 'full_import'
  scope jsonb,        -- arbitrary payload/filters tested
  status text not null default 'pending', -- 'pending'|'running'|'success'|'failed'
  started_at timestamptz,
  finished_at timestamptz,
  error text
);

create index if not exists import_runs_status_created_at_idx
  on admin.import_runs (status, created_at desc);

create index if not exists import_runs_kind_created_at_idx
  on admin.import_runs (kind, created_at desc);

