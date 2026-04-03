begin;

do $$
declare
  v_missing_active_count integer := 0;
  v_multi_active_count integer := 0;
  v_hash_collision_count integer := 0;
begin
  select count(*)::int
  into v_missing_active_count
  from public.card_prints cp
  join public.sets s
    on s.id = cp.set_id
  cross join lateral (
    select public.card_print_identity_backfill_projection_v1(
      s.source,
      cp.set_code,
      s.code,
      cp.number,
      cp.number_plain,
      cp.name,
      cp.variant_key,
      cp.printed_total,
      cp.printed_set_abbrev
    ) as projection
  ) projected
  where projected.projection ->> 'status' <> 'excluded'
    and not exists (
      select 1
      from public.card_print_identity cpi
      where cpi.card_print_id = cp.id
        and cpi.is_active = true
    );

  if v_missing_active_count > 0 then
    raise exception
      'card_print_identity post-backfill invariant failed: % card_print rows remain without an active identity row',
      v_missing_active_count;
  end if;

  select count(*)::int
  into v_multi_active_count
  from (
    select card_print_id
    from public.card_print_identity
    where is_active = true
    group by card_print_id
    having count(*) <> 1
  ) as multi_active;

  if v_multi_active_count > 0 then
    raise exception
      'card_print_identity post-backfill invariant failed: % card_print rows have duplicate active identity rows',
      v_multi_active_count;
  end if;

  select count(*)::int
  into v_hash_collision_count
  from (
    select identity_domain, identity_key_version, identity_key_hash
    from public.card_print_identity
    where is_active = true
    group by 1, 2, 3
    having count(*) > 1
  ) as collisions;

  if v_hash_collision_count > 0 then
    raise exception
      'card_print_identity post-backfill invariant failed: % active domain/version/hash collisions remain',
      v_hash_collision_count;
  end if;
end;
$$;

alter table public.card_print_identity
  add constraint card_print_identity_domain_version_check
  check (
    (identity_domain = 'pokemon_eng_standard' and identity_key_version = 'pokemon_eng_standard:v1')
    or (identity_domain = 'pokemon_ba' and identity_key_version = 'pokemon_ba:v1')
    or (identity_domain = 'pokemon_eng_special_print' and identity_key_version = 'pokemon_eng_special_print:v1')
    or (identity_domain = 'pokemon_jpn' and identity_key_version = 'pokemon_jpn:v1')
  );

alter table public.card_print_identity
  add constraint card_print_identity_active_required_fields_check
  check (
    not is_active
    or case
      when identity_domain = 'pokemon_eng_standard' then
        normalized_printed_name is not null
        and identity_payload ? 'variant_key_current'
      when identity_domain = 'pokemon_ba' then
        normalized_printed_name is not null
        and source_name_raw is not null
      when identity_domain = 'pokemon_eng_special_print' then
        normalized_printed_name is not null
        and identity_payload ? 'variant_key_current'
        and (
          identity_payload ? 'stamp_text'
          or identity_payload ? 'stamp_program'
          or identity_payload ? 'release_marking'
          or identity_payload ? 'distribution_mark'
        )
      when identity_domain = 'pokemon_jpn' then
        normalized_printed_name is not null
        and identity_payload ? 'language_code'
        and identity_payload ? 'rarity_policy'
        and identity_payload ? 'edition_marking'
        and identity_payload ? 'release_context'
      else false
    end
  );

commit;
