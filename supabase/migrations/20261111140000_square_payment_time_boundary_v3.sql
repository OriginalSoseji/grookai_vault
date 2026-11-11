-- A delayed historical payment/refund may mention an adopted Square SKU.
-- It must never consume the later physical copy's allocation. Provider payment
-- creation is immutable evidence; refund-updated timestamps are not a sale clock.
begin;
do $repair$
declare source text; definition text;
 marker text := '   select * into a from grookai_square.allocations where target_id=t.id for update;';
 replacement text := '   select * into a from grookai_square.allocations where target_id=t.id for update;
   if jsonb_typeof(snapshot->''payments'') is distinct from ''array'' or jsonb_array_length(snapshot->''payments'') not between 1 and 100
     or exists(select 1 from jsonb_array_elements(snapshot->''payments'') p where nullif(p->>''createdAt'','''') is null) then raise exception ''square_payment_time_unconfirmed''; end if;
   -- Historical authenticated evidence is retained, but cannot dispose this copy.
   if a.id is not null and exists(select 1 from jsonb_array_elements(snapshot->''payments'') p where (p->>''createdAt'')::timestamptz<a.created_at) then continue; end if;';
begin
 select prosrc,pg_get_functiondef(oid) into source,definition from pg_proc where oid='public.square_commerce_service_v2(text,jsonb)'::regprocedure;
 if encode(extensions.digest(source,'sha256'),'hex') is distinct from '994b954b7f832bcec5f1b5d209c94ab7239ae6a5809489c24656e11fc639b95f' then raise exception 'square_payment_time_source_drift'; end if;
 if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'square_payment_time_call_count_drift'; end if;
 execute replace(definition,marker,replacement);
end $repair$;
notify pgrst,'reload schema';
commit;
