-- POST-REC-02A-DEPENDENCY-TRANSFER-DUPLICATE-PARENT-CLEANUP GUARDED DRY-RUN TRANSACTION V1
-- Package fingerprint: c357295798fb92562e5c9aa7a1988d55da7020f763cdae8299822294b160a74a
-- Scope: 52 dependency-bearing padded/unpadded duplicate parent groups.
-- Excludes append-only feed rows.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

set local statement_timeout = '10min';

create temporary table post_rec02a_targets (
  canonical_parent_id uuid primary key,
  duplicate_parent_id uuid not null unique,
  canonical_gv_id text not null,
  duplicate_gv_id text not null,
  set_code text not null,
  normalized_key text not null,
  duplicate_child_count integer not null
) on commit drop;

insert into post_rec02a_targets (
  canonical_parent_id,
  duplicate_parent_id,
  canonical_gv_id,
  duplicate_gv_id,
  set_code,
  normalized_key,
  duplicate_child_count
) values
  ('fa33f1a3-1902-4111-82b0-3ab2efeb2124'::uuid, '3cd23751-aa60-4290-9ddb-bfc26c179a4e'::uuid, 'GV-PK-PR-SV-001', 'GV-PK-PR-SV-1', 'svp', 'svp|1|sprigatito||', 1),
  ('1154a3c4-8965-4ac8-be8f-6963bdad7a35'::uuid, '9f044f9b-155c-4341-b0cb-76d98a13a2c6'::uuid, 'GV-PK-PR-SV-011', 'GV-PK-PR-SV-11', 'svp', 'svp|11|arcanine||', 1),
  ('a20d299e-c452-48ae-876a-70513c4171bf'::uuid, '91256748-9c39-4f8c-afde-bd0150dae069'::uuid, 'GV-PK-PR-SV-012', 'GV-PK-PR-SV-12', 'svp', 'svp|12|dondozo||', 1),
  ('38573c4d-7323-4025-a2c9-9090be30a9ef'::uuid, '935bee38-6c43-43f2-8675-239e17291046'::uuid, 'GV-PK-PR-SV-013', 'GV-PK-PR-SV-13', 'svp', 'svp|13|miraidon||', 1),
  ('021b1475-367f-4cc3-bf50-43b578331619'::uuid, '7330cfd2-3857-4a06-b266-65fd008ffb4f'::uuid, 'GV-PK-PR-SV-014', 'GV-PK-PR-SV-14', 'svp', 'svp|14|koraidon||', 1),
  ('10b6b8a7-ccd5-47b1-97f7-65f55df0703d'::uuid, 'a1346047-1250-47b4-9a34-1320d55afcb4'::uuid, 'GV-PK-PR-SV-017', 'GV-PK-PR-SV-17', 'svp', 'svp|17|lucario ex||', 1),
  ('1c1b2f2e-9b6c-4b16-b737-3d5d7659bc53'::uuid, 'af5804f0-ce98-4206-8fca-b5466141fb16'::uuid, 'GV-PK-PR-SV-018', 'GV-PK-PR-SV-18', 'svp', 'svp|18|cyclizar ex||', 1),
  ('da212189-7a46-4cac-ac27-efac8930055a'::uuid, '590b469b-fcf7-418c-a760-3d52a2d475fe'::uuid, 'GV-PK-PR-SV-023', 'GV-PK-PR-SV-23', 'svp', 'svp|23|smoliv||', 1),
  ('ac2c59f1-38cb-4eea-b082-30b4b22b45d2'::uuid, '6cebe351-fe69-4cb3-bd19-7c73baeaf481'::uuid, 'GV-PK-PR-SV-024', 'GV-PK-PR-SV-24', 'svp', 'svp|24|growlithe||', 1),
  ('4659591e-e289-4844-b52d-603711c7573e'::uuid, '9974ccab-da03-42de-bfdb-dd69b273629b'::uuid, 'GV-PK-PR-SV-027', 'GV-PK-PR-SV-27', 'svp', 'svp|27|pikachu||', 1),
  ('276dee1b-f172-4c52-aa8f-abc104b438b5'::uuid, '8c805157-7ecb-4a3f-8c52-3240c69cd492'::uuid, 'GV-PK-PR-SV-028', 'GV-PK-PR-SV-28', 'svp', 'svp|28|miraidon ex||', 1),
  ('0cf0caab-76b3-4430-8878-5427f78d52af'::uuid, '80d88ba4-76cb-45b8-adc1-12f60d6f1068'::uuid, 'GV-PK-PR-SV-029', 'GV-PK-PR-SV-29', 'svp', 'svp|29|koraidon ex||', 1),
  ('6cd56d97-2450-48d4-a47f-a0bcde3972f3'::uuid, '49973fd9-e920-4562-8dbd-3782589cb927'::uuid, 'GV-PK-PR-SV-003', 'GV-PK-PR-SV-3', 'svp', 'svp|3|quaxly||', 1),
  ('218be4da-7037-4334-a9b0-70b1e6e06789'::uuid, '5311de95-28d5-4813-9533-ccb0eaa15eee'::uuid, 'GV-PK-PR-SV-030', 'GV-PK-PR-SV-30', 'svp', 'svp|30|chien-pao ex||', 1),
  ('aaf3fa99-4550-4d66-8a4c-22899eb83200'::uuid, '8d64a5ba-9724-4fa1-86ec-bfd35287e794'::uuid, 'GV-PK-PR-SV-034', 'GV-PK-PR-SV-34', 'svp', 'svp|34|skeledirge ex||', 1),
  ('5b72a481-2fff-4104-8dd7-c8dcc02626b7'::uuid, 'ccae9639-b04e-46bd-a97f-c2f5d031a726'::uuid, 'GV-PK-PR-SV-035', 'GV-PK-PR-SV-35', 'svp', 'svp|35|quaquaval ex||', 1),
  ('dd4dcf50-dca8-447d-933b-b1c483325a5b'::uuid, '0eff4b2d-0649-4fd4-84e4-fd19e25a7226'::uuid, 'GV-PK-PR-SV-042', 'GV-PK-PR-SV-42', 'svp', 'svp|42|houndstone||', 1),
  ('daa55ac3-2697-421a-a0c2-fa07dfc2c7e1'::uuid, 'a6af65cd-03d6-4e12-840e-d44081c21319'::uuid, 'GV-PK-PR-SV-049', 'GV-PK-PR-SV-49', 'svp', 'svp|49|zapdos ex||', 1),
  ('0c500907-b532-4c45-9b35-5cbe4059c21c'::uuid, '6e928c98-a997-4e16-a205-77f78c8e03f2'::uuid, 'GV-PK-PR-SV-050', 'GV-PK-PR-SV-50', 'svp', 'svp|50|alakazam ex||', 1),
  ('c7171ec8-743d-453d-bc8b-47517986916f'::uuid, '9eaf009b-ee67-4811-9e02-0e3ad92d8e23'::uuid, 'GV-PK-PR-SV-051', 'GV-PK-PR-SV-51', 'svp', 'svp|51|snorlax||', 1),
  ('257db1a1-6901-4db1-931e-e28545c27644'::uuid, 'de24b643-d925-4269-9295-4efaa31b2d03'::uuid, 'GV-PK-PR-SV-052', 'GV-PK-PR-SV-52', 'svp', 'svp|52|mewtwo||', 1),
  ('1972a9c9-064b-455f-824e-542a37623b36'::uuid, '1942848c-dff2-48e0-aaa8-f059db416977'::uuid, 'GV-PK-PR-SV-053', 'GV-PK-PR-SV-53', 'svp', 'svp|53|mew ex||', 1),
  ('5076f7d4-8d36-4560-9527-3aaadac3ef42'::uuid, 'a4f7588a-bb56-4bad-890b-50605ffeedfd'::uuid, 'GV-PK-PR-SV-055', 'GV-PK-PR-SV-55', 'svp', 'svp|55|kangaskhan ex||', 1),
  ('dbf93836-ccac-420f-9967-4281c7e775f6'::uuid, 'd1e3a12b-9bc1-40e2-ba80-cfadf5f04c6d'::uuid, 'GV-PK-PR-SV-056', 'GV-PK-PR-SV-56', 'svp', 'svp|56|charizard ex||', 1),
  ('e4bc07b0-08d5-46c9-b4b6-6217bec74cf8'::uuid, '83305754-cb20-4042-8b0d-ecca310380d9'::uuid, 'GV-PK-PR-SV-061', 'GV-PK-PR-SV-61', 'svp', 'svp|61|pineco||', 1),
  ('5e8642f6-1fb5-492a-9e73-8d5976083b9d'::uuid, '611b1fcb-8048-47c3-bb37-0a8036458cc8'::uuid, 'GV-PK-PR-SV-062', 'GV-PK-PR-SV-62', 'svp', 'svp|62|sinistea||', 1),
  ('6f7ddb77-58d2-4e0b-b761-4ce80881c739'::uuid, 'd66a9b95-9a87-438a-80ad-d5fcb9fc845c'::uuid, 'GV-PK-PR-SV-064', 'GV-PK-PR-SV-64', 'svp', 'svp|64|arctibax||', 1),
  ('1eb2ea7e-7b90-421c-a5f5-84ffec00c25d'::uuid, 'cd2e8ee9-01b3-4cec-bf4d-397841280640'::uuid, 'GV-PK-PR-SV-068', 'GV-PK-PR-SV-68', 'svp', 'svp|68|iron valiant ex||', 1),
  ('e5fcec1c-384f-47f7-8dfb-b81e8b88b31d'::uuid, 'ed39efeb-fdc6-4b04-94dd-bc9ec917743f'::uuid, 'GV-PK-PR-SV-070', 'GV-PK-PR-SV-70', 'svp', 'svp|70|greavard||', 1),
  ('123c2f60-a80a-4c07-a1fa-f0b53b09c2c6'::uuid, 'bfea0054-88bd-4948-9a23-a3c1cb982569'::uuid, 'GV-PK-PR-SV-071', 'GV-PK-PR-SV-71', 'svp', 'svp|71|maschiff||', 1),
  ('b3fedab3-1c3f-4aa3-816a-7b3fdcad2a3e'::uuid, '21b4f09d-b6ab-4adb-be2f-c1630760cc34'::uuid, 'GV-PK-PR-SV-072', 'GV-PK-PR-SV-72', 'svp', 'svp|72|great tusk ex||', 1),
  ('ca37b5e3-e21d-43cf-8322-55028194ab8a'::uuid, '608eaea1-fe02-4c9e-be93-36d23935a1a9'::uuid, 'GV-PK-PR-SV-073', 'GV-PK-PR-SV-73', 'svp', 'svp|73|iron treads ex||', 1),
  ('0658c806-e1be-48f4-9c4b-50b54bcd59da'::uuid, '87b4038a-8957-4102-baac-0a0752a1b76d'::uuid, 'GV-PK-PR-SV-074', 'GV-PK-PR-SV-74', 'svp', 'svp|74|charizard ex||', 1),
  ('95bf7fda-0385-4bd0-ab55-26375f189b88'::uuid, 'c724a1f5-37f4-48ed-96bd-19930cce63c7'::uuid, 'GV-PK-PR-SV-075', 'GV-PK-PR-SV-75', 'svp', 'svp|75|mimikyu||', 1),
  ('041b022e-8dea-4078-8189-2ca4ff16219c'::uuid, '922dbb0f-4d6d-4082-ba6e-1f547a6ca7e2'::uuid, 'GV-PK-PR-SV-077', 'GV-PK-PR-SV-77', 'svp', 'svp|77|floragato||', 1),
  ('52362404-5c65-4fe7-b2a4-43b7ed975d2e'::uuid, '58ddc3d4-bd4b-4d0a-bc3d-ff233f5a36e1'::uuid, 'GV-PK-PR-SV-078', 'GV-PK-PR-SV-78', 'svp', 'svp|78|meowscarada ex||', 1),
  ('86ea0095-d913-407e-8e64-7f018e3a542d'::uuid, '616f81f1-a3df-4f71-952d-bbb0122fddd6'::uuid, 'GV-PK-PR-SV-079', 'GV-PK-PR-SV-79', 'svp', 'svp|79|fuecoco||', 1),
  ('2853058a-cc88-468a-a3a3-e4bc1281c158'::uuid, '751d4bbe-926e-4267-b6d8-33e7c4c05782'::uuid, 'GV-PK-PR-SV-080', 'GV-PK-PR-SV-80', 'svp', 'svp|80|crocalor||', 1),
  ('09307184-d786-4590-a6b1-22ce990007a7'::uuid, '05beb8c1-e19a-458c-8714-469e213fded6'::uuid, 'GV-PK-PR-SV-081', 'GV-PK-PR-SV-81', 'svp', 'svp|81|skeledirge ex||', 1),
  ('d474bab4-49c1-4d11-8a96-5ca5ac6378be'::uuid, 'aab48d24-1a65-44d4-961a-8fbcfee12d14'::uuid, 'GV-PK-PR-SV-082', 'GV-PK-PR-SV-82', 'svp', 'svp|82|quaxly||', 1),
  ('29ef74b9-dca4-44f4-b3cf-5ad0c6d1e7ea'::uuid, '26c6b56b-d829-41e9-87f5-de767fdaaca2'::uuid, 'GV-PK-PR-SV-083', 'GV-PK-PR-SV-83', 'svp', 'svp|83|quaxwell||', 1),
  ('54feabc9-f65d-46fd-b3d4-71d35677f5a9'::uuid, '5043bce7-f57d-4325-a026-d6a37da3ce95'::uuid, 'GV-PK-PR-SV-086', 'GV-PK-PR-SV-86', 'svp', 'svp|86|mabosstiff ex||', 1),
  ('23e1224e-6a1d-49c0-94d2-5bb36a7e2711'::uuid, '5477b123-f3d5-4714-bd39-7b7397a8b5e0'::uuid, 'GV-PK-PR-SV-087', 'GV-PK-PR-SV-87', 'svp', 'svp|87|sprigatito ex||', 1),
  ('b7642ea2-8519-499e-b0a5-857943327933'::uuid, '61984aa6-9d6b-456c-9625-ecde4893091d'::uuid, 'GV-PK-PR-SV-088', 'GV-PK-PR-SV-88', 'svp', 'svp|88|pikachu||', 1),
  ('fee01f50-a98b-4594-b559-80d3da98e856'::uuid, '75bb8432-b187-4f94-a559-d55cf6cc7b61'::uuid, 'GV-PK-PR-SV-009', 'GV-PK-PR-SV-9', 'svp', 'svp|9|spidops||', 1),
  ('b4d77eb7-0a23-42e4-8365-59ab89a98cf5'::uuid, '96615575-de08-4370-aff4-77f66910f03a'::uuid, 'GV-PK-PR-SV-093', 'GV-PK-PR-SV-93', 'svp', 'svp|93|carvanha||', 1),
  ('e0e95ad4-64fb-4846-96b6-c1bc4bea89f6'::uuid, 'b6b0fa74-f011-4c8a-8953-de698686a47f'::uuid, 'GV-PK-PR-SV-094', 'GV-PK-PR-SV-94', 'svp', 'svp|94|bellibolt||', 1),
  ('e8df7cdf-b355-42a9-aebd-2e84a29ec39a'::uuid, '89a26c6b-55ae-4865-9298-a6a7b3bee303'::uuid, 'GV-PK-PR-SV-095', 'GV-PK-PR-SV-95', 'svp', 'svp|95|cleffa||', 1),
  ('799e08d1-667c-4b58-809b-313f1c615831'::uuid, '580ffe1e-1f6e-4dcd-99fd-bfbad7b3d95e'::uuid, 'GV-PK-PR-SV-096', 'GV-PK-PR-SV-96', 'svp', 'svp|96|cyclizar||', 1),
  ('bdce87a2-f2a9-45aa-aa7d-eddd5add43c3'::uuid, '0578797c-0d23-4ebb-a8de-7d861c953354'::uuid, 'GV-PK-PR-SV-097', 'GV-PK-PR-SV-97', 'svp', 'svp|97|flutter mane||', 1),
  ('9cb2307f-d80d-442b-9738-e9c7e3949e9a'::uuid, '7bee6735-51cf-4fb3-8d69-5f43f843a76b'::uuid, 'GV-PK-PR-SV-098', 'GV-PK-PR-SV-98', 'svp', 'svp|98|iron thorns||', 1),
  ('cfe55d5d-d756-411b-8850-eed580fb9667'::uuid, '02b75660-84f4-4164-8795-70efda01efc7'::uuid, 'GV-PK-PR-SV-099', 'GV-PK-PR-SV-99', 'svp', 'svp|99|shroodle||', 1);

do $$
declare
  v_targets integer;
  v_missing_parent integer;
  v_bad_parent_shape integer;
  v_append_only_refs integer;
  v_bad_child_refs integer := 0;
  v_new_printing_gv_conflicts integer;
  v_unhandled_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from post_rec02a_targets;
  if v_targets <> 52 then
    raise exception 'POST-REC-02A target count guard failed: expected 52, got %', v_targets;
  end if;

  select count(*) into v_missing_parent
  from post_rec02a_targets target
  left join public.card_prints canonical on canonical.id = target.canonical_parent_id
  left join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.id is null
     or duplicate.id is null
     or canonical.id = duplicate.id;

  if v_missing_parent <> 0 then
    raise exception 'POST-REC-02A missing parent guard failed: % rows', v_missing_parent;
  end if;

  select count(*) into v_bad_parent_shape
  from post_rec02a_targets target
  join public.card_prints canonical on canonical.id = target.canonical_parent_id
  join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.set_code <> duplicate.set_code
     or canonical.set_code <> target.set_code
     or canonical.name <> duplicate.name
     or canonical.number !~ '^0+[0-9]+[A-Za-z]*$'
     or duplicate.number ~ '^0+[0-9]+[A-Za-z]*$';

  if v_bad_parent_shape <> 0 then
    raise exception 'POST-REC-02A parent shape guard failed: % rows', v_bad_parent_shape;
  end if;

  select count(*) into v_append_only_refs
  from public.card_feed_events cfe
  join post_rec02a_targets target on target.duplicate_parent_id = cfe.card_print_id;

  if v_append_only_refs <> 0 then
    raise exception 'POST-REC-02A append-only feed exclusion guard failed: % refs', v_append_only_refs;
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
        'external_mappings',
        'external_discovery_candidates',
        'card_embeddings',
        'card_fingerprint_index',
        'scanner_fingerprint_index',
        'justtcg_variants',
        'justtcg_variant_prices_latest',
        'justtcg_variant_price_snapshots',
        'card_print_price_curves',
        'ebay_active_prices_latest',
        'ebay_active_price_snapshots',
        'pricing_jobs',
        'pricing_watch',
        'vault_item_instances',
        'vault_items',
        'card_interactions',
        'card_interaction_outcomes',
        'card_signals',
        'slab_certs',
        'card_feed_events'
      ])
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_parent_id from post_rec02a_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_unhandled_parent_refs := v_unhandled_parent_refs + v_dynamic_refs;
  end loop;

  if v_unhandled_parent_refs <> 0 then
    raise exception 'POST-REC-02A unhandled parent dependency guard failed: % refs', v_unhandled_parent_refs;
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
      and ref.relname = 'card_printings'
  loop
    execute format(
      'select count(*) from %I.%I where %I in (
         select cpr.id
         from public.card_printings cpr
         join post_rec02a_targets target on target.duplicate_parent_id = cpr.card_print_id
       )',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_bad_child_refs := v_bad_child_refs + v_dynamic_refs;
  end loop;

  if v_bad_child_refs <> 0 then
    raise exception 'POST-REC-02A duplicate child dependency guard failed: % refs', v_bad_child_refs;
  end if;

  select count(*) into v_new_printing_gv_conflicts
  from public.card_printings duplicate_child
  join post_rec02a_targets target on target.duplicate_parent_id = duplicate_child.card_print_id
  where not exists (
    select 1
    from public.card_printings canonical_child
    where canonical_child.card_print_id = target.canonical_parent_id
      and canonical_child.finish_key = duplicate_child.finish_key
  )
  and exists (
    select 1
    from public.card_printings any_child
    where any_child.printing_gv_id = replace(duplicate_child.printing_gv_id, target.duplicate_gv_id, target.canonical_gv_id)
      and any_child.id <> duplicate_child.id
  );

  if v_new_printing_gv_conflicts <> 0 then
    raise exception 'POST-REC-02A transfer printing_gv_id conflict guard failed: % rows', v_new_printing_gv_conflicts;
  end if;
end $$;

delete from public.external_mappings em
using post_rec02a_targets target
where em.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.external_mappings existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.source = em.source
      and existing.external_id = em.external_id
  );

update public.external_mappings em
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where em.card_print_id = target.duplicate_parent_id;

update public.external_discovery_candidates edc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where edc.card_print_id = target.duplicate_parent_id;

insert into public.card_print_traits
  (card_print_id, trait_type, trait_value, source, confidence, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity)
select
  target.canonical_parent_id,
  trait.trait_type,
  trait.trait_value,
  trait.source,
  trait.confidence,
  trait.hp,
  trait.national_dex,
  trait.types,
  trait.rarity,
  trait.supertype,
  trait.card_category,
  trait.legacy_rarity
from public.card_print_traits trait
join post_rec02a_targets target on target.duplicate_parent_id = trait.card_print_id
on conflict (card_print_id, trait_type, trait_value, source) do nothing;

delete from public.card_print_traits trait
using post_rec02a_targets target
where trait.card_print_id = target.duplicate_parent_id;

insert into public.card_print_species
  (card_print_id, species_id, role, counts_for_completion, source, confidence, evidence, active)
select
  target.canonical_parent_id,
  species.species_id,
  species.role,
  species.counts_for_completion,
  species.source,
  species.confidence,
  species.evidence,
  species.active
from public.card_print_species species
join post_rec02a_targets target on target.duplicate_parent_id = species.card_print_id
on conflict (card_print_id, species_id, role) where active = true do nothing;

delete from public.card_print_species species
using post_rec02a_targets target
where species.card_print_id = target.duplicate_parent_id;

delete from public.card_print_identity identity
using post_rec02a_targets target
where identity.card_print_id = target.duplicate_parent_id;

delete from public.card_embeddings ce
using post_rec02a_targets target
where ce.card_print_id = target.duplicate_parent_id
  and exists (
    select 1 from public.card_embeddings existing
    where existing.card_print_id = target.canonical_parent_id
  );

update public.card_embeddings ce
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where ce.card_print_id = target.duplicate_parent_id;

update public.card_fingerprint_index cfi
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cfi.card_print_id = target.duplicate_parent_id;

delete from public.scanner_fingerprint_index sfi
using post_rec02a_targets target
where sfi.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.scanner_fingerprint_index existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.hash_d = sfi.hash_d
      and existing.algorithm_version = sfi.algorithm_version
      and existing.source_type = sfi.source_type
  );

update public.scanner_fingerprint_index sfi
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where sfi.card_print_id = target.duplicate_parent_id;

update public.justtcg_variants jv
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jv.card_print_id = target.duplicate_parent_id;

update public.justtcg_variant_prices_latest jvl
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jvl.card_print_id = target.duplicate_parent_id;

update public.justtcg_variant_price_snapshots jvs
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jvs.card_print_id = target.duplicate_parent_id;

update public.card_print_price_curves cppc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cppc.card_print_id = target.duplicate_parent_id;

delete from public.ebay_active_prices_latest eapl
using post_rec02a_targets target
where eapl.card_print_id = target.duplicate_parent_id
  and exists (
    select 1 from public.ebay_active_prices_latest existing
    where existing.card_print_id = target.canonical_parent_id
  );

update public.ebay_active_prices_latest eapl
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where eapl.card_print_id = target.duplicate_parent_id;

update public.ebay_active_price_snapshots eaps
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where eaps.card_print_id = target.duplicate_parent_id;

update public.pricing_jobs pj
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where pj.card_print_id = target.duplicate_parent_id;

delete from public.pricing_watch pw
using post_rec02a_targets target
where pw.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.pricing_watch existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.watch_reason = pw.watch_reason
  );

update public.pricing_watch pw
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where pw.card_print_id = target.duplicate_parent_id;

update public.vault_item_instances vii
set card_printing_id = null,
    card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where vii.card_print_id = target.duplicate_parent_id;

update public.vault_items vi
set card_id = target.canonical_parent_id
from post_rec02a_targets target
where vi.card_id = target.duplicate_parent_id;

update public.card_interactions ci
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where ci.card_print_id = target.duplicate_parent_id;

update public.card_interaction_outcomes cio
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cio.card_print_id = target.duplicate_parent_id;

update public.card_signals cs
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cs.card_print_id = target.duplicate_parent_id;

update public.slab_certs sc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where sc.card_print_id = target.duplicate_parent_id;

delete from public.card_printings duplicate_child
using post_rec02a_targets target
where duplicate_child.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.card_printings canonical_child
    where canonical_child.card_print_id = target.canonical_parent_id
      and canonical_child.finish_key = duplicate_child.finish_key
  );

update public.card_printings duplicate_child
set
  card_print_id = target.canonical_parent_id,
  printing_gv_id = replace(duplicate_child.printing_gv_id, target.duplicate_gv_id, target.canonical_gv_id)
from post_rec02a_targets target
where duplicate_child.card_print_id = target.duplicate_parent_id;

do $$
declare
  v_remaining_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
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
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_parent_id from post_rec02a_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_remaining_refs := v_remaining_refs + v_dynamic_refs;
  end loop;

  if v_remaining_refs <> 0 then
    raise exception 'POST-REC-02A duplicate parent references remain: % refs', v_remaining_refs;
  end if;
end $$;

delete from public.card_prints cp
using post_rec02a_targets target
where cp.id = target.duplicate_parent_id;

do $$
declare
  v_remaining_duplicate_parents integer;
begin
  select count(*) into v_remaining_duplicate_parents
  from public.card_prints cp
  join post_rec02a_targets target on target.duplicate_parent_id = cp.id;

  if v_remaining_duplicate_parents <> 0 then
    raise exception 'POST-REC-02A duplicate parent delete simulation incomplete: % rows', v_remaining_duplicate_parents;
  end if;
end $$;

rollback;
