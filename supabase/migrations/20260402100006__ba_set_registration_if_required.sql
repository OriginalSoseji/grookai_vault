begin;

do $$
declare
  v_existing record;
begin
  select id, game, code, name
  into v_existing
  from public.sets
  where code = 'ba-2020'
  limit 1;

  if found then
    if coalesce(v_existing.game, '') <> 'pokemon' or coalesce(v_existing.name, '') <> 'Battle Academy 2020' then
      raise exception 'BA set registration blocked: existing set ba-2020 does not match the approved release container';
    end if;
  else
    insert into public.sets (
      game,
      code,
      name,
      source
    )
    values (
      'pokemon',
      'ba-2020',
      'Battle Academy 2020',
      jsonb_build_object(
        'battle_academy',
        jsonb_build_object(
          'contract', 'BATTLE_ACADEMY_CANON_CONTRACT_V1',
          'upstream_set_id', 'battle-academy-pokemon',
          'canonical_set_code', 'ba-2020'
        )
      )
    );
  end if;

  select id, game, code, name
  into v_existing
  from public.sets
  where code = 'ba-2022'
  limit 1;

  if found then
    if coalesce(v_existing.game, '') <> 'pokemon' or coalesce(v_existing.name, '') <> 'Battle Academy 2022' then
      raise exception 'BA set registration blocked: existing set ba-2022 does not match the approved release container';
    end if;
  else
    insert into public.sets (
      game,
      code,
      name,
      source
    )
    values (
      'pokemon',
      'ba-2022',
      'Battle Academy 2022',
      jsonb_build_object(
        'battle_academy',
        jsonb_build_object(
          'contract', 'BATTLE_ACADEMY_CANON_CONTRACT_V1',
          'upstream_set_id', 'battle-academy-2022-pokemon',
          'canonical_set_code', 'ba-2022'
        )
      )
    );
  end if;

  select id, game, code, name
  into v_existing
  from public.sets
  where code = 'ba-2024'
  limit 1;

  if found then
    if coalesce(v_existing.game, '') <> 'pokemon' or coalesce(v_existing.name, '') <> 'Battle Academy 2024' then
      raise exception 'BA set registration blocked: existing set ba-2024 does not match the approved release container';
    end if;
  else
    insert into public.sets (
      game,
      code,
      name,
      source
    )
    values (
      'pokemon',
      'ba-2024',
      'Battle Academy 2024',
      jsonb_build_object(
        'battle_academy',
        jsonb_build_object(
          'contract', 'BATTLE_ACADEMY_CANON_CONTRACT_V1',
          'upstream_set_id', 'battle-academy-2024-pokemon',
          'canonical_set_code', 'ba-2024'
        )
      )
    );
  end if;
end;
$$;

commit;
