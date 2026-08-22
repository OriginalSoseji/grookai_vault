begin;

revoke all on table public.vault_item_instance_dispositions
from service_role;
grant select, insert on table public.vault_item_instance_dispositions
to service_role;

notify pgrst, 'reload schema';

commit;
