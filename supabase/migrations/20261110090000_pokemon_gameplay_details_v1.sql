begin;

-- Domain-specific structured gameplay. Existing parent/trait/printing facts
-- retain their authorities. NULL means unknown; [] records an explicit array.
create or replace function public.pokemon_gameplay_array_valid_v1(p_kind text,p_value jsonb)
returns boolean language plpgsql immutable parallel safe set search_path='' as $$
declare item jsonb; symbol jsonb;
  energy_types constant text[]:=array['Grass','Fire','Water','Lightning','Psychic','Fighting','Darkness','Metal','Colorless','Dragon','Fairy'];
begin
  if p_value is null then return true; end if;
  if jsonb_typeof(p_value)<>'array' or jsonb_array_length(p_value)>64 then return false; end if;
  if p_kind is null or p_kind not in('attacks','abilities','weaknesses','resistances','rules','retreat_cost') then return false; end if;
  for item in select value from jsonb_array_elements(p_value) loop
    if p_kind in('rules','retreat_cost') then
      if jsonb_typeof(item)<>'string' or btrim(item#>>'{}')='' then return false; end if;
      if p_kind='retreat_cost' and not(item#>>'{}'=any(energy_types)) then return false; end if;
    elsif p_kind in('weaknesses','resistances') then
      if jsonb_typeof(item)<>'object' or not(item?&array['type','value']) then return false; end if;
      if (select count(*) from jsonb_object_keys(item))<>2 then return false; end if;
      if jsonb_typeof(item->'type')<>'string' or not(item->>'type'=any(energy_types))
        or jsonb_typeof(item->'value')<>'string' or btrim(item->>'value')='' then return false; end if;
    else
      if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'name') is distinct from 'string'
        or btrim(item->>'name')='' then return false; end if;
      if p_kind='abilities' then
        if not(item?&array['name','kind','text']) or (select count(*) from jsonb_object_keys(item))<>3
          or jsonb_typeof(item->'kind') is distinct from 'string' or btrim(item->>'kind')='' then return false; end if;
      else
        if not(item?&array['name','cost','damage','text']) or (select count(*) from jsonb_object_keys(item))<>4 then return false; end if;
        if item->'cost'<>'null'::jsonb then
          if jsonb_typeof(item->'cost')<>'array' or jsonb_array_length(item->'cost')>20 then return false; end if;
          for symbol in select value from jsonb_array_elements(item->'cost') loop
            if jsonb_typeof(symbol)<>'string' or not(symbol#>>'{}'=any(energy_types)) then return false; end if;
          end loop;
        end if;
        if item->'damage'<>'null'::jsonb and (jsonb_typeof(item->'damage')<>'string' or btrim(item->>'damage')='' or char_length(item->>'damage')>64) then return false; end if;
      end if;
      if item->'text'<>'null'::jsonb and (jsonb_typeof(item->'text')<>'string' or btrim(item->>'text')='') then return false; end if;
    end if;
  end loop;
  return true;
end $$;
revoke all on function public.pokemon_gameplay_array_valid_v1(text,jsonb) from public,anon,authenticated;
grant execute on function public.pokemon_gameplay_array_valid_v1(text,jsonb) to service_role;

create table if not exists public.pokemon_card_gameplay_details_v1(
  card_print_id uuid primary key references public.card_prints(id) on delete restrict,
  identity_id uuid not null references public.card_print_identity(id) on delete restrict,
  identity_key_hash text not null check(identity_key_hash~'^[0-9a-f]{64}$'),
  language_code text not null check(language_code in('en','ja')),
  normalization_version text not null check(normalization_version='pokemon_gameplay_details:v1'),
  verification_status text not null check(verification_status in('source_supported','official_verified')),
  source_provider text not null check(source_provider in('pokemonapi','tcgdex','official_jp','limitless_jp')),
  source_card_id text not null check(btrim(source_card_id)<>''),
  source_url text not null check(source_url~'^https://[^[:space:]]+$'),
  source_raw_import_id bigint not null references public.raw_imports(id) on delete restrict,
  source_body_sha256 text not null check(source_body_sha256~'^[0-9a-f]{64}$'),
  source_observed_at timestamptz not null,
  attacks jsonb check(public.pokemon_gameplay_array_valid_v1('attacks',attacks)),
  abilities jsonb check(public.pokemon_gameplay_array_valid_v1('abilities',abilities)),
  weaknesses jsonb check(public.pokemon_gameplay_array_valid_v1('weaknesses',weaknesses)),
  resistances jsonb check(public.pokemon_gameplay_array_valid_v1('resistances',resistances)),
  rules jsonb check(public.pokemon_gameplay_array_valid_v1('rules',rules)),
  retreat_cost jsonb check(public.pokemon_gameplay_array_valid_v1('retreat_cost',retreat_cost)),
  retreat_count integer check(retreat_count between 0 and 20),
  evolves_from_label text check(evolves_from_label is null or btrim(evolves_from_label)<>''),
  card_text text check(card_text is null or btrim(card_text)<>''),
  flavor_text text check(flavor_text is null or btrim(flavor_text)<>''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pokemon_gameplay_details_has_observation check(
    attacks is not null or abilities is not null or weaknesses is not null or resistances is not null
    or rules is not null or retreat_cost is not null or retreat_count is not null
    or evolves_from_label is not null or card_text is not null or flavor_text is not null),
  constraint pokemon_gameplay_details_timestamp_order check(updated_at>=created_at)
);
create index if not exists pokemon_gameplay_details_identity_v1_idx on public.pokemon_card_gameplay_details_v1(identity_id);
create index if not exists pokemon_gameplay_details_source_v1_idx on public.pokemon_card_gameplay_details_v1(source_raw_import_id);

create or replace function public.pokemon_gameplay_identity_guard_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare domain text; identity_count integer;
begin
  select p.identity_domain into strict domain from public.card_prints p where p.id=new.card_print_id;
  if (domain='pokemon_eng_standard' and new.language_code<>'en')
    or (domain='pokemon_jpn' and new.language_code<>'ja')
    or domain not in('pokemon_eng_standard','pokemon_jpn') then
    raise exception 'pokemon_gameplay_domain_language_mismatch' using errcode='23514';
  end if;
  select count(*) into identity_count from public.card_print_identity i
    where i.card_print_id=new.card_print_id and i.is_active;
  if identity_count<>1 or not exists(
    select 1 from public.card_print_identity i where i.id=new.identity_id and i.card_print_id=new.card_print_id
      and i.is_active and i.identity_domain=domain and i.identity_key_hash=new.identity_key_hash
      and i.identity_key_hash=public.card_print_identity_hash_v1(i.identity_domain,i.identity_key_version,
        i.set_code_identity,i.printed_number,i.normalized_printed_name,i.source_name_raw,i.identity_payload)
  ) then raise exception 'pokemon_gameplay_exact_current_identity_required' using errcode='23514'; end if;
  return new;
end $$;
revoke all on function public.pokemon_gameplay_identity_guard_v1() from public,anon,authenticated,service_role;
do $$ begin
  if not exists(select 1 from pg_trigger where tgrelid='public.pokemon_card_gameplay_details_v1'::regclass
    and tgname='pokemon_gameplay_identity_guard_v1' and not tgisinternal) then
    create trigger pokemon_gameplay_identity_guard_v1 before insert or update on public.pokemon_card_gameplay_details_v1
      for each row execute function public.pokemon_gameplay_identity_guard_v1();
  end if;
end $$;

alter table public.pokemon_card_gameplay_details_v1 enable row level security;
alter table public.pokemon_card_gameplay_details_v1 force row level security;
revoke all on table public.pokemon_card_gameplay_details_v1 from public,anon,authenticated,service_role;
grant select,insert on table public.pokemon_card_gameplay_details_v1 to service_role;
comment on table public.pokemon_card_gameplay_details_v1 is
  'Private source-backed Pokemon gameplay details, separate from traits, identities, printings and legality. NULL is unknown; [] is an explicitly supplied empty array. Readers must rejoin the exact active identity/hash and existing visibility authority.';
comment on column public.pokemon_card_gameplay_details_v1.evolves_from_label is
  'Exact provider label only; not a species relationship or Dex-completion claim.';
commit;
