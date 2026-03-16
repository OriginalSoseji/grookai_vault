create table public.slab_provenance_events (
  id uuid primary key default gen_random_uuid(),
  slab_cert_id uuid not null references public.slab_certs(id),
  card_print_id uuid null references public.card_prints(id),
  vault_item_id uuid null references public.vault_items(id),
  event_type text not null,
  event_source text null,
  source_event_key text null,
  price numeric null,
  currency text null,
  event_metadata jsonb null,
  event_ts timestamptz not null,
  created_at timestamptz not null default now(),
  constraint slab_provenance_events_event_type_not_blank
    check (btrim(event_type) <> ''),
  constraint slab_provenance_events_event_source_not_blank
    check (event_source is null or btrim(event_source) <> ''),
  constraint slab_provenance_events_source_event_key_not_blank
    check (source_event_key is null or btrim(source_event_key) <> ''),
  constraint slab_provenance_events_source_identity_complete
    check (source_event_key is null or (event_source is not null and btrim(event_source) <> '')),
  constraint slab_provenance_events_price_nonnegative
    check (price is null or price >= 0),
  constraint slab_provenance_events_currency_not_blank
    check (currency is null or btrim(currency) <> '')
);

comment on table public.slab_provenance_events is
'Slab provenance V1 append-only event ledger anchored to slab_cert_id. Separate from slab current state, pricing, and fingerprint provenance.';

create unique index slab_provenance_events_source_identity_key
  on public.slab_provenance_events (slab_cert_id, event_source, source_event_key)
  where source_event_key is not null;

create index slab_provenance_events_slab_cert_id_idx
  on public.slab_provenance_events (slab_cert_id);

create index slab_provenance_events_slab_cert_event_ts_idx
  on public.slab_provenance_events (slab_cert_id, event_ts desc);

create index slab_provenance_events_event_type_idx
  on public.slab_provenance_events (event_type);

create index slab_provenance_events_event_source_idx
  on public.slab_provenance_events (event_source);

create index slab_provenance_events_card_print_id_idx
  on public.slab_provenance_events (card_print_id);

create index slab_provenance_events_vault_item_id_idx
  on public.slab_provenance_events (vault_item_id);

create or replace function public.gv_slab_provenance_events_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'slab_provenance_events is append-only';
end;
$$;

create trigger trg_slab_provenance_events_block_update
before update on public.slab_provenance_events
for each row
execute function public.gv_slab_provenance_events_block_mutation();

create trigger trg_slab_provenance_events_block_delete
before delete on public.slab_provenance_events
for each row
execute function public.gv_slab_provenance_events_block_mutation();
