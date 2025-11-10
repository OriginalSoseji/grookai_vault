create schema if not exists admin;
create or replace function admin.import_prices_do(_payload jsonb, _bridge_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if _bridge_token is distinct from current_setting('app.bridge_token', true) then
    raise exception 'unauthorized';
  end if;
  -- TODO: perform the real inserts/updates using _payload
  return jsonb_build_object('ok', true, 'received', _payload);
end;
$$;
revoke all on function admin.import_prices_do(jsonb, text) from public;
grant execute on function admin.import_prices_do(jsonb, text) to anon;