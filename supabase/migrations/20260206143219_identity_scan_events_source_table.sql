-- Add source_table to identity_scan_events to track envelope origin (identity_snapshots vs condition_snapshots)

alter table if exists public.identity_scan_events
  add column if not exists source_table text not null default 'condition_snapshots';

alter table if exists public.identity_scan_events
  drop constraint if exists identity_scan_events_source_table_check;

alter table if exists public.identity_scan_events
  add constraint identity_scan_events_source_table_check
  check (source_table in ('identity_snapshots', 'condition_snapshots'));

comment on column public.identity_scan_events.source_table is
'Origin table for the snapshot envelope: identity_snapshots (new) or condition_snapshots (legacy).';
