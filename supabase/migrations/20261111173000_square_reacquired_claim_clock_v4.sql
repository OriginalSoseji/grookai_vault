-- A retained allocation row can represent a later, explicitly reacquired claim.
-- Use its latest immutable allocation request clock, preserving the original row
-- and old requests, so an earlier payment cannot consume the reacquired copy.
begin;
do $repair$
declare source text; definition text;
 marker text:='(p->>''createdAt'')::timestamptz<a.created_at';
 replacement text:='(p->>''createdAt'')::timestamptz<coalesce((select max(claim.created_at) from grookai_square.stock_operations claim where claim.allocation_id=a.id and claim.kind=''allocate''),a.created_at)';
begin
 select prosrc,pg_get_functiondef(oid) into source,definition from pg_proc where oid='public.square_commerce_service_v2(text,jsonb)'::regprocedure;
 if encode(extensions.digest(source,'sha256'),'hex') is distinct from '503b8deacf2d65751c8153a2e5fdd6502f1c2961f5be0c339a2b588f9fab2f72' then raise exception 'square_reacquired_clock_source_drift'; end if;
 if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'square_reacquired_clock_marker_drift'; end if;
 execute replace(definition,marker,replacement);
end $repair$;
create index square_allocation_request_clock_v4 on grookai_square.stock_operations(allocation_id,created_at desc) where kind='allocate';
notify pgrst,'reload schema';
commit;
