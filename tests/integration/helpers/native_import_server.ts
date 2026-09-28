import { requireUser, createServiceRoleClient } from "../../../supabase/functions/_shared/auth.ts";
import { createImportHandler } from "../../../supabase/functions/vault-import-targets-v1/handler.ts";
Deno.serve({ hostname: "127.0.0.1", port: 57450 }, createImportHandler({ requireUser, createServiceRoleClient }));
