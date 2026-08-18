begin;

create table if not exists public.vault_item_instance_dispositions (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null default 'VENDOR_MODE_EXACT_COPY_DISPOSITION_V1',
  user_id uuid not null references auth.users(id) on delete cascade,
  vault_item_instance_id uuid not null references public.vault_item_instances(id),
  card_print_id uuid not null references public.card_prints(id),
  card_printing_id uuid null references public.card_printings(id),
  gv_vi_id text not null,
  disposition_type text not null check (disposition_type in ('sale', 'trade')),
  condition_label text null,
  intent_at_disposition text null,
  asking_price_amount numeric null check (
    asking_price_amount is null or asking_price_amount >= 0
  ),
  asking_price_currency text null check (
    asking_price_currency is null or (
      asking_price_currency = upper(asking_price_currency)
      and char_length(asking_price_currency) = 3
    )
  ),
  created_at timestamptz not null default now(),
  constraint vault_item_instance_dispositions_one_per_copy
    unique (vault_item_instance_id),
  constraint vault_item_instance_dispositions_price_pair
    check (
      (asking_price_amount is null and asking_price_currency is null)
      or
      (asking_price_amount is not null and asking_price_currency is not null)
    ),
  constraint vault_item_instance_dispositions_gvvi_normalized
    check (btrim(gv_vi_id) <> '' and gv_vi_id = upper(btrim(gv_vi_id)))
);

comment on table public.vault_item_instance_dispositions is
'Append-only owner evidence that one exact GVVI left the active Vault through an off-platform sale or trade. Asking price is captured only as a snapshot and is not a realized transaction value.';

create index if not exists vault_item_instance_dispositions_owner_created_idx
  on public.vault_item_instance_dispositions (user_id, created_at desc);

create index if not exists vault_item_instance_dispositions_card_created_idx
  on public.vault_item_instance_dispositions (card_print_id, created_at desc);

alter table public.vault_item_instance_dispositions enable row level security;

drop policy if exists vault_item_instance_dispositions_owner_select
  on public.vault_item_instance_dispositions;
create policy vault_item_instance_dispositions_owner_select
on public.vault_item_instance_dispositions
for select
to authenticated
using (user_id = auth.uid());

revoke all on table public.vault_item_instance_dispositions
from public, anon, authenticated;
grant select on table public.vault_item_instance_dispositions
to authenticated;
grant select, insert on table public.vault_item_instance_dispositions
to service_role;

create or replace function public.vault_dispose_exact_instance_v1(
  p_instance_id uuid,
  p_disposition_type text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_disposition_type text := lower(btrim(coalesce(p_disposition_type, '')));
  v_instance public.vault_item_instances%rowtype;
  v_card_print_id uuid;
  v_event public.vault_item_instance_dispositions%rowtype;
  v_archive jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_instance_id is null then
    raise exception 'instance_id_required' using errcode = '22023';
  end if;

  if v_disposition_type not in ('sale', 'trade') then
    raise exception 'invalid_disposition_type' using errcode = '22023';
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where id = p_instance_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0002';
  end if;

  if v_instance.archived_at is not null then
    raise exception 'vault_instance_already_archived' using errcode = '23514';
  end if;

  if v_instance.gv_vi_id is null or btrim(v_instance.gv_vi_id) = '' then
    raise exception 'vault_instance_missing_gvvi' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.vault_item_instance_dispositions d
    where d.vault_item_instance_id = v_instance.id
  ) then
    raise exception 'vault_instance_disposition_already_recorded' using errcode = '23505';
  end if;

  v_card_print_id := v_instance.card_print_id;
  if v_card_print_id is null and v_instance.slab_cert_id is not null then
    select sc.card_print_id
    into v_card_print_id
    from public.slab_certs sc
    where sc.id = v_instance.slab_cert_id;
  end if;

  if v_card_print_id is null then
    raise exception 'vault_instance_missing_card_print' using errcode = '23514';
  end if;

  insert into public.vault_item_instance_dispositions (
    user_id,
    vault_item_instance_id,
    card_print_id,
    card_printing_id,
    gv_vi_id,
    disposition_type,
    condition_label,
    intent_at_disposition,
    asking_price_amount,
    asking_price_currency
  ) values (
    v_uid,
    v_instance.id,
    v_card_print_id,
    v_instance.card_printing_id,
    upper(btrim(v_instance.gv_vi_id)),
    v_disposition_type,
    v_instance.condition_label,
    v_instance.intent,
    v_instance.asking_price_amount,
    case
      when v_instance.asking_price_amount is null then null
      else upper(coalesce(nullif(btrim(v_instance.asking_price_currency), ''), 'USD'))
    end
  )
  returning * into v_event;

  v_archive := public.vault_archive_exact_instance_v1(v_instance.id);

  if coalesce(v_archive ->> 'archived_instance_id', '') <> v_instance.id::text
     or coalesce(v_archive ->> 'gv_vi_id', '') <> upper(btrim(v_instance.gv_vi_id))
     or coalesce(v_archive ->> 'card_print_id', '') <> v_card_print_id::text then
    raise exception 'vault_instance_archive_readback_mismatch' using errcode = 'P0001';
  end if;

  return v_archive || jsonb_build_object(
    'disposition_id', v_event.id,
    'disposition_type', v_event.disposition_type,
    'asking_price_snapshot_amount', v_event.asking_price_amount,
    'asking_price_snapshot_currency', v_event.asking_price_currency,
    'recorded_at', v_event.created_at
  );
end;
$$;

revoke all on function public.vault_dispose_exact_instance_v1(uuid, text)
from public, anon;
grant execute on function public.vault_dispose_exact_instance_v1(uuid, text)
to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
