-- Make identity_scan_events.snapshot_id nullable to finalize dual-envelope support

alter table if exists public.identity_scan_events
  alter column snapshot_id drop not null;

comment on column public.identity_scan_events.snapshot_id is
'Legacy condition envelope pointer (condition_snapshots.id); null for identity_snapshots source.';

comment on column public.identity_scan_events.identity_snapshot_id is
'Identity envelope pointer (identity_snapshots.id); null for legacy condition source.';

-- Envelope check remains enforced by identity_scan_events_envelope_check (from prior migration)
