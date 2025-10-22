create table if not exists public.scan_daily_metrics (
  day date primary key,
  scans integer not null default 0,
  used_server_pct numeric not null default 0,
  used_lazy_pct numeric not null default 0,
  mean_conf numeric not null default 0,
  p95_ms integer not null default 0,
  updated_at timestamptz not null default now()
);

