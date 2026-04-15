begin;

-- CEL25C_MULTI_ORIGIN_REPRINT_LANE_REPAIR_V1
--
-- Scope:
-- - public.card_prints rows in set_id = 3be64773-d30e-48af-af8c-3563b57e5e4a only
-- - public.external_mappings rows for pokemonapi cel25c 15-family only
-- - one scoped uniqueness transition to exempt cel25c from the legacy V2
--   number-slot uniqueness contract while preserving V2 semantics elsewhere
--
-- Invariants:
-- - cel25c remains 25 rows
-- - the 25 expected Classic Collection names remain present exactly once
-- - no row deletions
-- - duplicate number reuse remains lawful inside cel25c
-- - JustTCG continuity for Here Comes Team Rocket! is preserved

create unique index if not exists uq_card_prints_identity_v3_print_identity
on public.card_prints (
  set_id,
  number_plain,
  print_identity_key,
  coalesce(variant_key, '')
)
where set_id is not null
  and number_plain is not null
  and print_identity_key is not null;

create unique index if not exists uq_card_prints_identity_v2_non_cel25c
on public.card_prints (
  set_id,
  number_plain,
  coalesce(printed_identity_modifier, ''),
  coalesce(variant_key, '')
)
where set_id is not null
  and number_plain is not null
  and set_id <> '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid;

drop index if exists public.uq_card_prints_identity_v2;

do $$
declare
  v_set_exists boolean;
  v_cel25c_row_count integer;
  v_expected_name_drift boolean;
begin
  select exists (
    select 1
    from public.sets s
    where s.id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid
      and s.code = 'cel25c'
  )
  into v_set_exists;

  if v_set_exists then
    select count(*)
    into v_cel25c_row_count
    from public.card_prints cp
    where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid;

    if v_cel25c_row_count <> 25 then
      raise exception
        'cel25c repair aborted: expected 25 rows, found %',
        v_cel25c_row_count;
    end if;

    with expected(name) as (
      values
        ('Blastoise'),
        ('Charizard'),
        ('Dark Gyarados'),
        ('Team Magma''s Groudon'),
        ('Venusaur'),
        ('Here Comes Team Rocket!'),
        ('Rocket''s Zapdos'),
        ('Claydol'),
        ('Umbreon ★'),
        ('Cleffa'),
        ('_____''s Pikachu'),
        ('Mewtwo-EX'),
        ('Tapu Lele-GX'),
        ('Shining Magikarp'),
        ('Imposter Professor Oak'),
        ('M Rayquaza-EX'),
        ('Rocket''s Admin.'),
        ('Mew ex'),
        ('Gardevoir ex δ'),
        ('Xerneas-EX'),
        ('Donphan'),
        ('Luxray GL LV.X'),
        ('Reshiram'),
        ('Zekrom'),
        ('Garchomp C LV.X')
    ),
    counts as (
      select
        e.name,
        count(cp.id) as row_count
      from expected e
      left join public.card_prints cp
        on cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid
       and cp.name = e.name
      group by e.name
    )
    select exists (
      select 1
      from counts
      where row_count <> 1
    )
    into v_expected_name_drift;

    if v_expected_name_drift then
      raise exception
        'cel25c repair aborted: expected-name surface drifted';
    end if;

    update public.card_prints cp
    set
      number = case cp.id
        when '3eb0cb6b-15f1-4f62-8cd5-97fa08ec8734'::uuid then '15'
        when 'a130c820-cd75-4f2e-8acf-dfc77beb63eb'::uuid then '15'
        else cp.number
      end,
      variant_key = case
        when cp.id in (
          'c267755e-9f4a-4ed5-a6aa-190dd42ae977'::uuid,
          '3eb0cb6b-15f1-4f62-8cd5-97fa08ec8734'::uuid,
          'a130c820-cd75-4f2e-8acf-dfc77beb63eb'::uuid
        ) then 'cc'
        else cp.variant_key
      end,
      gv_id = case cp.id
        when 'c267755e-9f4a-4ed5-a6aa-190dd42ae977'::uuid then 'GV-PK-CEL-15CC-HERE-COMES-TEAM-ROCKET'
        when '3eb0cb6b-15f1-4f62-8cd5-97fa08ec8734'::uuid then 'GV-PK-CEL-15CC-ROCKET-S-ZAPDOS'
        when 'a130c820-cd75-4f2e-8acf-dfc77beb63eb'::uuid then 'GV-PK-CEL-15CC-CLAYDOL'
        else cp.gv_id
      end,
      external_ids = case cp.id
        when 'd62d4f5c-277b-4f32-b5aa-a393d990fbb3'::uuid then
          jsonb_set(coalesce(cp.external_ids, '{}'::jsonb), '{pokemonapi}', to_jsonb('cel25c-15_A1'::text), true)
        when 'c267755e-9f4a-4ed5-a6aa-190dd42ae977'::uuid then
          jsonb_set(coalesce(cp.external_ids, '{}'::jsonb), '{pokemonapi}', to_jsonb('cel25c-15_A2'::text), true)
        when '3eb0cb6b-15f1-4f62-8cd5-97fa08ec8734'::uuid then
          jsonb_set(coalesce(cp.external_ids, '{}'::jsonb), '{pokemonapi}', to_jsonb('cel25c-15_A3'::text), true)
        when 'a130c820-cd75-4f2e-8acf-dfc77beb63eb'::uuid then
          jsonb_set(coalesce(cp.external_ids, '{}'::jsonb), '{pokemonapi}', to_jsonb('cel25c-15_A4'::text), true)
        else cp.external_ids
      end
    where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid
      and cp.id in (
        'd62d4f5c-277b-4f32-b5aa-a393d990fbb3'::uuid,
        'c267755e-9f4a-4ed5-a6aa-190dd42ae977'::uuid,
        '3eb0cb6b-15f1-4f62-8cd5-97fa08ec8734'::uuid,
        'a130c820-cd75-4f2e-8acf-dfc77beb63eb'::uuid
      );

    insert into public.external_mappings (
      card_print_id,
      source,
      external_id,
      active
    )
    values
      ('d62d4f5c-277b-4f32-b5aa-a393d990fbb3'::uuid, 'pokemonapi', 'cel25c-15_A1', true),
      ('c267755e-9f4a-4ed5-a6aa-190dd42ae977'::uuid, 'pokemonapi', 'cel25c-15_A2', true),
      ('3eb0cb6b-15f1-4f62-8cd5-97fa08ec8734'::uuid, 'pokemonapi', 'cel25c-15_A3', true),
      ('a130c820-cd75-4f2e-8acf-dfc77beb63eb'::uuid, 'pokemonapi', 'cel25c-15_A4', true)
    on conflict (source, external_id) do update
      set card_print_id = excluded.card_print_id,
          active = excluded.active;

    with projected as (
      select
        cp.id,
        lower(
          concat_ws(
            ':',
            coalesce(nullif(btrim(cp.set_code), ''), 'cel25c'),
            cp.number_plain,
            lower(
              regexp_replace(
                trim(
                  both '-' from regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          regexp_replace(
                            regexp_replace(coalesce(cp.name, ''), '’', '''', 'g'),
                            'δ', ' delta ', 'g'
                          ),
                          '[★*]', ' star ', 'g'
                        ),
                        '\s+EX\b', '-ex', 'gi'
                      ),
                      '\s+GX\b', '-gx', 'gi'
                    ),
                    '[^a-zA-Z0-9]+',
                    '-',
                    'g'
                  )
                ),
                '-+',
                '-',
                'g'
              )
            ),
            nullif(lower(coalesce(cp.printed_identity_modifier, '')), '')
          )
        ) as next_print_identity_key
      from public.card_prints cp
      where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid
    )
    update public.card_prints cp
    set print_identity_key = p.next_print_identity_key
    from projected p
    where cp.id = p.id
      and cp.print_identity_key is distinct from p.next_print_identity_key;

    if (
      select count(*)
      from public.card_prints cp
      where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid
        and coalesce(nullif(btrim(cp.variant_key), ''), '∅') = 'cc'
    ) <> 25 then
      raise exception
        'cel25c repair verification failed: all 25 rows are not in cc lane';
    end if;

    if exists (
      select 1
      from public.card_prints cp
      where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid
        and cp.name in ('Venusaur', 'Here Comes Team Rocket!', 'Rocket''s Zapdos', 'Claydol')
        and cp.number_plain <> '15'
    ) then
      raise exception
        'cel25c repair verification failed: 15-family numbers are not aligned';
    end if;

    if exists (
      select 1
      from (
        select
          cp.name,
          cp.external_ids ->> 'pokemonapi' as pokemonapi_external_id
        from public.card_prints cp
        where cp.set_id = '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid
          and cp.name in ('Venusaur', 'Here Comes Team Rocket!', 'Rocket''s Zapdos', 'Claydol', 'Umbreon ★')
      ) x
      where (x.name = 'Venusaur' and x.pokemonapi_external_id <> 'cel25c-15_A1')
         or (x.name = 'Here Comes Team Rocket!' and x.pokemonapi_external_id <> 'cel25c-15_A2')
         or (x.name = 'Rocket''s Zapdos' and x.pokemonapi_external_id <> 'cel25c-15_A3')
         or (x.name = 'Claydol' and x.pokemonapi_external_id <> 'cel25c-15_A4')
         or (x.name = 'Umbreon ★' and x.pokemonapi_external_id <> 'cel25c-17_A')
    ) then
      raise exception
        'cel25c repair verification failed: pokemonapi alignment mismatch remains';
    end if;

    if not exists (
      select 1
      from public.external_mappings em
      where em.card_print_id = 'c267755e-9f4a-4ed5-a6aa-190dd42ae977'::uuid
        and em.source = 'justtcg'
        and em.external_id = 'pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection'
        and em.active = true
    ) then
      raise exception
        'cel25c repair verification failed: Here Comes Team Rocket! JustTCG mapping continuity lost';
    end if;
  else
    raise notice 'cel25c canonical set row not present; data repair skipped';
  end if;
end $$;

commit;
