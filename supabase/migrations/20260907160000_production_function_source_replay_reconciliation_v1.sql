-- Preserve the exact existing production function bodies during fresh replay.
-- Source: sealed ownership read-only audit, 2026-09-07, PostgreSQL 17.4.
-- Snapshot SHA-256: cff3fcec67ff54d77e5ad3ff02e513ad03dc03c7374edc921e3a1d52e5683ed7.
-- No-op for the frozen live definitions. Only the exact LF replay versions may
-- be restored to the production CRLF bytes. Do not generalize this to arbitrary
-- whitespace: newlines in SQL string literals can carry meaning.
-- No data, grants, owners, view definitions or unrelated functions are changed.

begin;

do $reconcile$
declare
  item record;
  target_oid oid;
  definition text;
  body text;
  actual_sha256 text;
  replacement text;
begin
  for item in
    select * from jsonb_to_recordset($manifest$
[
  {
    "name": "_append_price_tick",
    "args": "",
    "replay_sha256": "988be9f400efecdaad7f0e3a031297863d24f466571c581cd1b275712b493673",
    "production_sha256": "5faa00ee98578bb068a7083d02c98fabfe6a20c5e17ae485ac32d4f87b5e299d"
  },
  {
    "name": "admin_condition_assist_insert_failure_v1",
    "args": "p_snapshot_id uuid, p_attempted_snapshot_id uuid, p_analysis_version text, p_analysis_key text, p_error_code text, p_error_detail text",
    "replay_sha256": "315a01a72fb911e95033d0a76cf9643a84091ee2e7738f9df2b5663e9c950524",
    "production_sha256": "9fac6dffd7d1eeb0e88ab7ff8171e4ef918dc855bbfe78f575cfd3f82e8f69cc"
  },
  {
    "name": "admin_fingerprint_bind_v1",
    "args": "p_user_id uuid, p_fingerprint_key text, p_vault_item_id uuid, p_snapshot_id uuid, p_analysis_key text",
    "replay_sha256": "00ba63c628ae265ce72851ba393e1771771e96a2e71a242db5dd8029a9fa9ee0",
    "production_sha256": "58c352c0ed1ffe72454c152de59d0d6813554c86fc074032714912370e00121a"
  },
  {
    "name": "admin_fingerprint_event_insert_v1",
    "args": "p_user_id uuid, p_analysis_key text, p_event_type text, p_snapshot_id uuid, p_fingerprint_key text, p_vault_item_id uuid, p_event_metadata jsonb",
    "replay_sha256": "bd17bbd70c3474d6cb424b7b00c1762226b00cbf8d2a8bf3f8062b1eaf5bcef8",
    "production_sha256": "44086d1f81a0849688e4c096440f43bb23173fe37717686c5652a733deda43db"
  },
  {
    "name": "card_history",
    "args": "_set_code text, _number text, _source text, _hours integer",
    "replay_sha256": "7959237584f0dfa83a77c5f7007b3b2dc74445687be34f478c1a99d8912a9e0c",
    "production_sha256": "9f62dd0301d165f06db8d278c024727247535e55ea852778147788ff0cdae8a8"
  },
  {
    "name": "collector_memories_for_gvvi_v1",
    "args": "p_gv_vi_id text, p_limit integer, p_before_created_at timestamp with time zone, p_before_id uuid",
    "replay_sha256": "19ac1910b05c8c2dc223192eab6339e7a369a27507742b944073968c6d48318e",
    "production_sha256": "9d73baa7e84676effc5ec607dcf15fb460acda4d4c5200cbd189203e2bb8274d"
  },
  {
    "name": "collector_memory_archive_v1",
    "args": "p_memory_id uuid",
    "replay_sha256": "1ca2a96f606b85e25a509ba8c3e5529103437905f2de7df89e418d88f81c7ff8",
    "production_sha256": "dfbba8164c1be741abcbfc920e20fd0387de13fc9681d5d03d844a977cfdc6a2"
  },
  {
    "name": "collector_memory_set_public_v1",
    "args": "p_memory_id uuid, p_is_public boolean",
    "replay_sha256": "4d08f923ddfd1284bb937e74bb6cc0072e99b57ef5a3a6841f237b891801cc85",
    "production_sha256": "38d701bfecde68aa730ce1298e98ab738771d1db68e0b5e04b0016f0472dd2ba"
  },
  {
    "name": "compute_vault_values",
    "args": "days_window integer",
    "replay_sha256": "345d43652d07f7ba981340e753393f17e443c1b9c68c26402ddcd72d331fa6bc",
    "production_sha256": "3e3fa523de83359790ac594366fe63af48a013555ab56a526d228b8963dc5a35"
  },
  {
    "name": "condition_snapshots_insert_v1",
    "args": "p_vault_item_id uuid, p_images jsonb",
    "replay_sha256": "7a74b54aa58999758852b18f39fbef531cf511c52e888841f4b45fe7e2bfe75d",
    "production_sha256": "8339bb86aaff3879ff54e45aa78e13dbd2c85a8cd9de7a013aefa6152a310ba8"
  },
  {
    "name": "enqueue_refresh_latest_card_prices",
    "args": "",
    "replay_sha256": "71a1701686fcac40cd453b4fe05d3d99c748480444edb51bd374b41f84cd0aa2",
    "production_sha256": "4453defb0b2a3e1e96181585385813c98a315a49b81a296b2d24373a7cae37b1"
  },
  {
    "name": "fill_price_obs_print_id",
    "args": "",
    "replay_sha256": "3cf956ec18fd3db35613c54f406d4a420ec7d4564ad27b39f027c40accae0b3e",
    "production_sha256": "5ad04eec144da5dae00d336c35cb1695c3c592c4b4ce8bdda7c6548fd6ea9196"
  },
  {
    "name": "get_all_prices_for_card",
    "args": "p_card_id uuid",
    "replay_sha256": "2cebce5be484fcb08dc08886d6eed6c8baf5c4dcc7ed31de83ac355de266d22b",
    "production_sha256": "9cec13d8af36c20191e080e0528238e6156230648434d90fe231246e20018ec8"
  },
  {
    "name": "get_market_price",
    "args": "p_card_id uuid",
    "replay_sha256": "190039a1b4f3d821995d23bec5c072ab41e2ed95bb1d8a5cc4070a5271baf2a4",
    "production_sha256": "cdf5e91f1f326fda6787aecb8b64eebe8688287ba3df3923d756d27c76f9fe94"
  },
  {
    "name": "gv_condition_snapshots_set_auth_uid",
    "args": "",
    "replay_sha256": "c44bd24447367560c9ae8282ba612e5bb47e7fb5e10cb3730e0df9d8dd84eb47",
    "production_sha256": "1ed190e7688f1ac01f37fedda69204e9d2c15a0a8f3cd3b431f7397e70e6080f"
  },
  {
    "name": "gv_enqueue_condition_analysis_job_v1",
    "args": "",
    "replay_sha256": "9f3cd3204ab40694c87e722d5b54d8e6af2ed4a51306444089f4375c90943909",
    "production_sha256": "57934375da5eec8d8aaa6c496f0bad9e3c6da498922a1559f70b2d066d674464"
  },
  {
    "name": "list_missing_price_sets",
    "args": "",
    "replay_sha256": "5bfd6ed877020e4648ed2924b5e55072f849f8f5d0e98556ba0d925842bb28fa",
    "production_sha256": "466982bfa48e4efe265341c2f81b8718dc9f240e95777562fe17e4537a08078e"
  },
  {
    "name": "list_set_codes",
    "args": "",
    "replay_sha256": "75ee139e40d5d5c9f0d99430b2aa458af322c5068dd2ca543f1885171366ea1b",
    "production_sha256": "d62bdf4753caeb387c1f9eabba85258ac18fddc82b6622a38bff6657766f061e"
  },
  {
    "name": "pulse_eligible_events_for_viewer_v1",
    "args": "p_viewer_user_id uuid",
    "replay_sha256": "f217f7a5bb849e39877f377b54cb9b678650e8ea97cff8ee1e0be19d616511e7",
    "production_sha256": "17ced2bc770d8f7b9902403fafbfdd17a07275640a5121d1ea70b3ea0ef38ee6"
  },
  {
    "name": "refresh_latest_card_prices_mv",
    "args": "",
    "replay_sha256": "d2b3a356b4588a067bf33dc5ac52d7db0f2077a38a64a7b36079b3cf0d135cda",
    "production_sha256": "d4b262c787dbaa9c43334b759ab28028e6144583ccd775c965c17f71fee23633"
  },
  {
    "name": "refresh_latest_prices",
    "args": "",
    "replay_sha256": "a9302f5c8f8d8586573241681bf1d0676aa17f251333b3e0072d47969848cfe8",
    "production_sha256": "92a122a299251619e29c6ddd0a24abb584fc90f29ccae7051d59c317b2288136"
  },
  {
    "name": "refresh_vault_market_prices",
    "args": "",
    "replay_sha256": "3e0c4a338dfe5a75b5ed370d1d7e70f2d600593cc2512013bc1053577eb842ba",
    "production_sha256": "fa8c605e5426b3169e96cad7e93215a0e3ca0cbd06af675be13ec2a1d33ac5ec"
  },
  {
    "name": "refresh_vault_market_prices",
    "args": "p_user uuid",
    "replay_sha256": "db9cdb83b862e18ec6b5ca343e3ad32f037cb9aa812a7441d3a0de03369ddae2",
    "production_sha256": "f9c46e71056d492acbde3076066d4f08b4ddd49889e1da77ecc0b9d2dc9be610"
  },
  {
    "name": "refresh_vault_market_prices_all",
    "args": "",
    "replay_sha256": "5cc5e125eaa9499dae99f32a27cace2575dd6af6699a73a3d2f5e19c089408ff",
    "production_sha256": "9ac330ad003bb9ab5064dbc2a8f85fd8e80a1389c50488ac5d45d5a1857e8d1a"
  },
  {
    "name": "rpc_set_item_condition",
    "args": "p_vault_item_id uuid, p_condition_label text, p_card_id uuid, p_market_price numeric",
    "replay_sha256": "e335929aaceed83e44c547e872223aa60b14d88f3c112ef82807bccd62bc884f",
    "production_sha256": "928cf6304fac0d8d4e22eb9d58c24094ce5150a9f6a145437f466f501428c6b8"
  },
  {
    "name": "search_card_prints_v1",
    "args": "q text, limit_n integer",
    "replay_sha256": "90180faaea5ae0ffb9a3d80c92a383b68be00ed4ffc4ee1ec1b948ee3168cd67",
    "production_sha256": "ab5cf4bf31a59b9b482915c548c22582e5a1357b3fe7a611fea48406e1cc6b7c"
  },
  {
    "name": "search_cards",
    "args": "q text, \"limit\" integer, \"offset\" integer",
    "replay_sha256": "d19d00e0f15e2955522e2815203823eff446414a8ced234c53cf527ab203d8dc",
    "production_sha256": "098c3e0b8a2131712df8f622d7b5ef64340470fb0f7641018ddb3af1bd781e78"
  },
  {
    "name": "set_auth_uid",
    "args": "",
    "replay_sha256": "16cb4b37ce0c74b74e10c925fba8bc306b84dd0e36ee5b614bc2426b1659411d",
    "production_sha256": "6de1268ee2843ce2b30c06cfaaedb48f4d15160b79236aac134275733c916fff"
  },
  {
    "name": "top_movers_24h",
    "args": "limit_n integer, only_positive boolean",
    "replay_sha256": "0ef5d625aba095dd55eff91bc1c9e60562da43ce34e41b380ecc2cca75133732",
    "production_sha256": "2bb8c2de4ee6cdbb95a3ce3f09ec3751ec7894b9970ba182ed0def56d58c86c1"
  },
  {
    "name": "vault_archive_selected_cards_v1",
    "args": "p_card_print_ids uuid[]",
    "replay_sha256": "5da26c461bf4eade54abb9f0a6682c155f7584b1b64f235203781518b5bbe2a7",
    "production_sha256": "54f2630444cd25983c0af19d5c7d20190e36282579d8be82cb9958d9c708aa2d"
  },
  {
    "name": "wishlist_totals",
    "args": "",
    "replay_sha256": "a6ca0ea912b8648356cd413956c867577d2bd1869aeb93faff28eb00fe9e0b64",
    "production_sha256": "06c60b09dda5dc63008c053181d0d7f975d6b18ad6070f8bd9e1016b04849432"
  },
  {
    "name": "wishlist_totals_for",
    "args": "p_user uuid",
    "replay_sha256": "753b13f32c3a1e14cdee756379acbb0394abe59b5728bfe7e7c49945221e2775",
    "production_sha256": "0433f7baeca61778bde542c616ebdb33140e264f9c095dbccca9bf768174b2ca"
  }
]
$manifest$::jsonb) as m(name text, args text, replay_sha256 text, production_sha256 text)
  loop
    select p.oid, pg_get_functiondef(p.oid), p.prosrc
      into target_oid, definition, body
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = item.name
      and pg_get_function_identity_arguments(p.oid) = item.args;

    if target_oid is null then
      raise exception 'reconciliation function missing: %(%)', item.name, item.args;
    end if;
    actual_sha256 := encode(sha256(convert_to(definition, 'UTF8')), 'hex');
    if actual_sha256 = item.production_sha256 then
      continue;
    end if;
    if actual_sha256 <> item.replay_sha256 then
      raise exception 'reconciliation definition drift: %(%)', item.name, item.args;
    end if;

    replacement := replace(definition,
      'AS $function$' || body || '$function$',
      'AS $function$' || replace(body, E'\n', E'\r\n') || '$function$');
    if encode(sha256(convert_to(replacement, 'UTF8')), 'hex') <> item.production_sha256 then
      raise exception 'reconciliation replacement mismatch: %(%)', item.name, item.args;
    end if;
    execute replacement;
    if encode(sha256(convert_to(pg_get_functiondef(target_oid), 'UTF8')), 'hex') <> item.production_sha256 then
      raise exception 'reconciliation readback mismatch: %(%)', item.name, item.args;
    end if;
  end loop;
end;
$reconcile$;

commit;
