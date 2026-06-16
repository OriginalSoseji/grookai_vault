-- ENRICH-13C1-RADIANT-COLLECTION-DUPLICATE-TRANSFER-DRY-RUN GUARDED DRY-RUN TRANSACTION V1
-- Generated for review/proof only.
-- Package fingerprint: 6336e52e453641b1041a54e61313178e0998016f58a2c2df0e8a706f370e4566
-- Scope: 20 Radiant Collection duplicate parent dependency transfers.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

create temporary table enrich13c1_targets (
  duplicate_card_print_id uuid primary key,
  canonical_owner_card_print_id uuid not null,
  set_code text not null,
  card_number text not null,
  number_plain text not null,
  duplicate_name text not null,
  canonical_owner_name text not null,
  printed_identity_modifier text not null,
  source_external_id text
) on commit drop;

insert into enrich13c1_targets (
  duplicate_card_print_id,
  canonical_owner_card_print_id,
  set_code,
  card_number,
  number_plain,
  duplicate_name,
  canonical_owner_name,
  printed_identity_modifier,
  source_external_id
) values
  ('9d14ba0c-b863-4d49-8f0b-10d978e25171'::uuid, '7acb6ae7-9749-49c6-bdc4-128e0fda1ebe'::uuid, 'bw11', 'RC1', '1', 'Snivy', 'Snivy', 'number_prefix:RC', 'bw11-RC1'),
  ('d8ce6d2f-2025-49fa-83d7-bc575a791b31'::uuid, '74c5fba4-3cae-43d2-9770-24dd1a4991f2'::uuid, 'bw11', 'RC3', '3', 'Serperior', 'Serperior', 'number_prefix:RC', 'bw11-RC3'),
  ('974f95cf-ed5b-4021-adaf-3135bd6a851d'::uuid, 'ba6a6c23-fd10-4715-b698-3a266c95b7ae'::uuid, 'bw11', 'RC4', '4', 'Growlithe', 'Growlithe', 'number_prefix:RC', 'bw11-RC4'),
  ('559eefb2-df85-4aca-b573-ee9b1f1061be'::uuid, 'efa15a49-a1f9-46b0-bd69-85111388328e'::uuid, 'bw11', 'RC5', '5', 'Torchic', 'Torchic', 'number_prefix:RC', 'bw11-RC5'),
  ('dc8bbc07-d0f6-41f4-bbde-5b1f18e80b0f'::uuid, '93bc63a0-3285-4360-8eb8-965d81bd26e8'::uuid, 'bw11', 'RC6', '6', 'Piplup', 'Piplup', 'number_prefix:RC', 'bw11-RC6'),
  ('96a74c90-395c-4f46-a5d9-f2d7cd70351c'::uuid, 'fca222fa-9629-4b95-8e3e-c156871f1131'::uuid, 'bw11', 'RC7', '7', 'Pikachu', 'Pikachu', 'number_prefix:RC', 'bw11-RC7'),
  ('bac974e4-c472-4f27-9acd-f18d4bb6f60e'::uuid, 'def3b50f-4d4d-45f4-a4c0-29f91b8dbb0f'::uuid, 'bw11', 'RC9', '9', 'Kirlia', 'Kirlia', 'number_prefix:RC', 'bw11-RC9'),
  ('a53e052b-7854-4044-91eb-a3b7695f5a7b'::uuid, '9ff063db-4121-456f-839a-f79822b7c7e0'::uuid, 'bw11', 'RC10', '10', 'Gardevoir', 'Gardevoir', 'number_prefix:RC', 'bw11-RC10'),
  ('5ff4a1fd-d1ec-4907-bb7e-0071c6ea302f'::uuid, 'ae5f8da5-8739-423f-a909-a4b35ef1f0f7'::uuid, 'bw11', 'RC12', '12', 'Stunfisk', 'Stunfisk', 'number_prefix:RC', 'bw11-RC12'),
  ('22e8f1e4-b75b-4c0d-a17a-1f2d03490479'::uuid, '32e149cf-89c2-4786-9b59-fd20fecfd746'::uuid, 'bw11', 'RC13', '13', 'Purrloin', 'Purrloin', 'number_prefix:RC', 'bw11-RC13'),
  ('d57d16ff-5e21-4e58-9cf2-791d3130d57e'::uuid, '2b3996ed-c314-4ccf-9c60-d3e7c13f6d62'::uuid, 'bw11', 'RC14', '14', 'Eevee', 'Eevee', 'number_prefix:RC', 'bw11-RC14'),
  ('f819c23d-5ba7-45bd-8b10-611e09404df7'::uuid, 'f8d2770e-13a8-48ab-8fdd-f2134fcb43dc'::uuid, 'bw11', 'RC15', '15', 'Teddiursa', 'Teddiursa', 'number_prefix:RC', 'bw11-RC15'),
  ('85f3e3cc-88c3-4764-af10-15f925f84fff'::uuid, '64593d79-0242-4354-93d8-4fa5d27be758'::uuid, 'bw11', 'RC16', '16', 'Ursaring', 'Ursaring', 'number_prefix:RC', 'bw11-RC16'),
  ('d73f7221-4dfa-4bfb-8f50-8ab81a78244f'::uuid, '5cd07513-7d98-4952-accb-13efc906441a'::uuid, 'bw11', 'RC18', '18', 'Minccino', 'Minccino', 'number_prefix:RC', 'bw11-RC18'),
  ('58b916a9-9516-4988-b05b-d91803b7a223'::uuid, '25c0588d-9275-4b49-9b1d-1a590cc29f5c'::uuid, 'bw11', 'RC19', '19', 'Cinccino', 'Cinccino', 'number_prefix:RC', 'bw11-RC19'),
  ('d56ed317-6505-4578-9aa5-40fd5fc84f69'::uuid, '3b203a61-0bb1-486d-be32-32c724e71a7f'::uuid, 'bw11', 'RC20', '20', 'Elesa', 'Elesa', 'number_prefix:RC', 'bw11-RC20'),
  ('9dfbd0bf-2397-47e2-94ce-bd99258755ce'::uuid, '8f425977-bcfe-4a9f-bb2b-7d972a613ccb'::uuid, 'bw11', 'RC21', '21', 'Shaymin-EX', 'Shaymin-EX', 'number_prefix:RC', 'bw11-RC21'),
  ('40e81e35-2fb5-4ee0-852a-3579e2dfcea9'::uuid, '2a03720e-a769-4898-b16b-aee0e6501ccd'::uuid, 'bw11', 'RC22', '22', 'Reshiram', 'Reshiram', 'number_prefix:RC', 'bw11-RC22'),
  ('5fc644f5-26c9-4f5c-aecb-4dbb703010b4'::uuid, 'e9a99417-070e-4e70-9dc2-ddbbb907e03e'::uuid, 'bw11', 'RC23', '23', 'Emolga', 'Emolga', 'number_prefix:RC', 'bw11-RC23'),
  ('6ccd25fb-8fd1-4588-a380-fd75b97295e6'::uuid, '7b64eeaf-63e5-491e-b70e-893ba616e6eb'::uuid, 'bw11', 'RC24', '24', 'Mew-EX', 'Mew-EX', 'number_prefix:RC', 'bw11-RC24');

do $$
declare
  v_targets integer;
  v_bad_identity integer;
  v_printing_refs integer;
  v_disallowed_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from enrich13c1_targets;
  if v_targets <> 20 then
    raise exception 'ENRICH-13C1 target count guard failed: expected 20, got %', v_targets;
  end if;

  select count(*) into v_bad_identity
  from enrich13c1_targets target
  left join public.card_prints duplicate on duplicate.id = target.duplicate_card_print_id
  left join public.card_prints owner on owner.id = target.canonical_owner_card_print_id
  where duplicate.id is null
     or owner.id is null
     or duplicate.id = owner.id
     or duplicate.set_code is not null
     or duplicate.number is not null
     or owner.set_code <> target.set_code
     or owner.number <> target.card_number
     or owner.number_plain <> target.number_plain
     or owner.name <> target.canonical_owner_name
     or owner.printed_identity_modifier <> target.printed_identity_modifier
     or target.printed_identity_modifier <> 'number_prefix:RC'
     or target.card_number !~ '^RC[0-9]+$';

  if v_bad_identity <> 0 then
    raise exception 'ENRICH-13C1 RC owner identity guard failed: % rows', v_bad_identity;
  end if;

  select count(*) into v_printing_refs
  from public.card_printings cpr
  join enrich13c1_targets target on target.duplicate_card_print_id = cpr.card_print_id
  where exists (select 1 from public.external_printing_mappings epm where epm.card_printing_id = cpr.id)
     or exists (select 1 from public.vault_item_instances vii where vii.card_printing_id = cpr.id)
     or exists (select 1 from public.canon_warehouse_candidates cwc where cwc.promoted_card_printing_id = cpr.id);

  if v_printing_refs <> 0 then
    raise exception 'ENRICH-13C1 duplicate child printing dependency guard failed: % refs', v_printing_refs;
  end if;

  for r in
    select
      rel_ns.nspname as schema_name,
      rel.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
    join pg_class ref on ref.oid = con.confrelid
    join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
    where con.contype = 'f'
      and rel_ns.nspname = 'public'
      and ref.relname = 'card_prints'
      and rel.relname <> all(array[
        'card_print_identity',
        'card_print_species',
        'card_print_traits',
        'card_printings',
        'external_mappings'
      ])
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_card_print_id from enrich13c1_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_parent_refs := v_disallowed_parent_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_parent_refs <> 0 then
    raise exception 'ENRICH-13C1 disallowed parent dependency guard failed: % refs', v_disallowed_parent_refs;
  end if;
end $$;

delete from public.external_mappings em
using enrich13c1_targets target
where em.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.external_mappings owner_em
    where owner_em.card_print_id = target.canonical_owner_card_print_id
      and owner_em.source = em.source
      and owner_em.external_id = em.external_id
  );

update public.external_mappings em
set card_print_id = target.canonical_owner_card_print_id
from enrich13c1_targets target
where em.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_identity cpi
using enrich13c1_targets target
where cpi.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_traits cpt
using enrich13c1_targets target
where cpt.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_print_traits owner_trait
    where owner_trait.card_print_id = target.canonical_owner_card_print_id
      and owner_trait.trait_type = cpt.trait_type
      and owner_trait.trait_value = cpt.trait_value
      and owner_trait.source = cpt.source
  );

update public.card_print_traits cpt
set card_print_id = target.canonical_owner_card_print_id
from enrich13c1_targets target
where cpt.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_species cps
using enrich13c1_targets target
where cps.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_print_species owner_species
    where owner_species.card_print_id = target.canonical_owner_card_print_id
      and owner_species.species_id = cps.species_id
      and owner_species.role = cps.role
      and owner_species.source = cps.source
      and owner_species.active = cps.active
  );

update public.card_print_species cps
set card_print_id = target.canonical_owner_card_print_id,
    updated_at = now()
from enrich13c1_targets target
where cps.card_print_id = target.duplicate_card_print_id;

delete from public.card_printings cpr
using enrich13c1_targets target
where cpr.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_printings owner_printing
    where owner_printing.card_print_id = target.canonical_owner_card_print_id
      and owner_printing.finish_key = cpr.finish_key
  );

update public.card_printings cpr
set card_print_id = target.canonical_owner_card_print_id
from enrich13c1_targets target
where cpr.card_print_id = target.duplicate_card_print_id;

do $$
declare
  v_remaining_duplicate_dependencies integer;
  v_identity_duplicates integer;
  v_external_duplicates integer;
  v_child_duplicates integer;
begin
  select
    (select count(*) from public.external_mappings where card_print_id in (select duplicate_card_print_id from enrich13c1_targets))
    + (select count(*) from public.card_print_identity where card_print_id in (select duplicate_card_print_id from enrich13c1_targets))
    + (select count(*) from public.card_print_traits where card_print_id in (select duplicate_card_print_id from enrich13c1_targets))
    + (select count(*) from public.card_print_species where card_print_id in (select duplicate_card_print_id from enrich13c1_targets))
    + (select count(*) from public.card_printings where card_print_id in (select duplicate_card_print_id from enrich13c1_targets))
  into v_remaining_duplicate_dependencies;

  if v_remaining_duplicate_dependencies <> 0 then
    raise exception 'ENRICH-13C1 remaining duplicate dependencies guard failed: % rows', v_remaining_duplicate_dependencies;
  end if;

  select count(*) into v_identity_duplicates
  from (
    select identity_domain, identity_key_hash
    from public.card_print_identity
    where is_active = true
    group by identity_domain, identity_key_hash
    having count(*) > 1
  ) dupes;
  if v_identity_duplicates <> 0 then
    raise exception 'ENRICH-13C1 active identity duplicate guard failed: % groups', v_identity_duplicates;
  end if;

  select count(*) into v_external_duplicates
  from (
    select source, external_id
    from public.external_mappings
    where coalesce(active, true) = true
    group by source, external_id
    having count(distinct card_print_id) > 1
  ) dupes;
  if v_external_duplicates <> 0 then
    raise exception 'ENRICH-13C1 external mapping duplicate guard failed: % groups', v_external_duplicates;
  end if;

  select count(*) into v_child_duplicates
  from (
    select card_print_id, finish_key
    from public.card_printings
    group by card_print_id, finish_key
    having count(*) > 1
  ) dupes;
  if v_child_duplicates <> 0 then
    raise exception 'ENRICH-13C1 child printing duplicate guard failed: % groups', v_child_duplicates;
  end if;
end $$;

delete from public.card_prints cp
using enrich13c1_targets target
where cp.id = target.duplicate_card_print_id;

rollback;
