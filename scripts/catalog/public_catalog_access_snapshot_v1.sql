select jsonb_build_object(
  'sanity', jsonb_build_object(
    'cards', (select count(*) from public.card_prints),
    'sets', (select count(*) from public.sets),
    'traits', (select count(*) from public.card_print_traits)
  ),
  'controls', (select coalesce(jsonb_agg(to_jsonb(c) order by c.game_code), '[]')
    from public.catalog_game_release_controls c),
  'setOverrides', (select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object('game', s.game, 'code', s.code)
    order by c.set_id), '[]') from public.catalog_set_release_controls c join public.sets s on s.id=c.set_id),
  'protected', jsonb_build_object(
    'sealedControls', (select coalesce(jsonb_agg(to_jsonb(c) order by c.game_key), '[]') from public.sealed_product_game_release_controls c),
    'sealedPricePointers', (select coalesce(jsonb_agg(to_jsonb(c) order by c.game_key), '[]') from public.sealed_product_release_pointer c),
    'sealedImagePointers', (select coalesce(jsonb_agg(to_jsonb(c) order by c.game_key), '[]') from public.sealed_product_image_release_pointer c),
    'pricingAnonExecute', has_function_privilege('anon', 'public.get_market_pricing_read_model_v1(uuid[],uuid[])', 'execute'),
    'pricingAuthExecute', has_function_privilege('authenticated', 'public.get_market_pricing_read_model_v1(uuid[],uuid[])', 'execute'),
    'functions', (select jsonb_agg(jsonb_build_object('name', p.oid::regprocedure::text,
      'definition', md5(pg_get_functiondef(p.oid)), 'acl', p.proacl) order by p.oid::regprocedure::text)
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
      and (p.proname like 'catalog_%visible_to_request_v1' or p.proname in
        ('get_public_catalog_sets_v2','get_market_pricing_read_model_v1','sealed_product_game_visible_to_request_v1'))),
    'policies', (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname)
      from pg_policies p where p.schemaname='public' and p.tablename in
        ('card_prints','sets','catalog_game_release_controls','catalog_set_release_controls','vault_items'))
  ),
  'samples', (select jsonb_agg(to_jsonb(x) order by x.game) from (
    select g.game, c.id, c.gv_id, c.set_id, c.name, c.image_path
    from (values ('mtg'),('one_piece')) g(game)
    cross join lateral (select cp.id, cp.gv_id, cp.set_id, cp.name, cp.image_path
      from public.sets s join public.card_prints cp on cp.set_id=s.id
      where s.game=g.game and cp.gv_id is not null and cp.image_path is not null
      and coalesce(cp.data_quality_flags #>> '{app_visibility_v1,status}','visible') <> 'suppressed'
      and not exists (select 1 from public.catalog_set_release_controls sc where sc.set_id=s.id and sc.release_status='hidden')
      order by s.id,cp.id limit 1) c
  ) x)
) as evidence;
