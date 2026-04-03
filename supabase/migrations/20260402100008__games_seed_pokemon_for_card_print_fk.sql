begin;

do $$
declare
  v_match_count integer := 0;
begin
  select count(*)::int
  into v_match_count
  from public.games
  where lower(coalesce(code, '')) = 'pokemon'
     or lower(coalesce(name, '')) = 'pokemon'
     or lower(coalesce(slug, '')) = 'pokemon';

  if v_match_count > 1 then
    raise exception
      'pokemon game alignment blocked: expected at most one canonical Pokemon game row, found %',
      v_match_count;
  end if;

  if v_match_count = 0 then
    insert into public.games (
      code,
      name,
      slug
    )
    values (
      'pokemon',
      'Pokemon',
      'pokemon'
    );
  end if;
end;
$$;

commit;
