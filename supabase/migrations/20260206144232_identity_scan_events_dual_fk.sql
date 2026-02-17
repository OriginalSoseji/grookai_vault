-- Dual-envelope support for identity_scan_events: identity_snapshots (new) or condition_snapshots (legacy)

-- 1) Add nullable identity_snapshot_id if missing
alter table if exists public.identity_scan_events
  add column if not exists identity_snapshot_id uuid null;

-- 2) Add FK to identity_snapshots (idempotent)
alter table if exists public.identity_scan_events
  drop constraint if exists identity_scan_events_identity_snapshot_id_fkey;

alter table if exists public.identity_scan_events
  add constraint identity_scan_events_identity_snapshot_id_fkey
  foreign key (identity_snapshot_id) references public.identity_snapshots(id) on delete cascade;

-- 3) Envelope exclusivity by source_table (idempotent)
alter table if exists public.identity_scan_events
  drop constraint if exists identity_scan_events_envelope_check;

alter table if exists public.identity_scan_events
  add constraint identity_scan_events_envelope_check
  check (
    (source_table = 'identity_snapshots' and identity_snapshot_id is not null and snapshot_id is null)
    or
    (source_table = 'condition_snapshots' and snapshot_id is not null and identity_snapshot_id is null)
  );

-- 4) Comments
comment on column public.identity_scan_events.identity_snapshot_id is
'Identity envelope pointer (identity_snapshots.id). Used when source_table = identity_snapshots.';

comment on column public.identity_scan_events.snapshot_id is
'Legacy condition envelope pointer (condition_snapshots.id). Used when source_table = condition_snapshots.';

-- Verification (run manually):
-- Valid combos:
-- insert into public.identity_scan_events (user_id, identity_snapshot_id, source_table, signals, candidates, status, analysis_version)
-- values (auth.uid(), '00000000-0000-0000-0000-000000000000', 'identity_snapshots', '{}', '[]', 'pending', 'v1'); -- expect FK fail unless id exists
-- insert into public.identity_scan_events (user_id, snapshot_id, source_table, signals, candidates, status, analysis_version)
-- values (auth.uid(), '00000000-0000-0000-0000-000000000000', 'condition_snapshots', '{}', '[]', 'pending', 'v1'); -- expect FK fail unless id exists
-- Invalid (should fail check):
-- insert into public.identity_scan_events (user_id, snapshot_id, identity_snapshot_id, source_table, signals, candidates, status, analysis_version)
-- values (auth.uid(), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'identity_snapshots', '{}', '[]', 'pending', 'v1');
