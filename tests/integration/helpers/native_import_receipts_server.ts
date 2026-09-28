import { createImportHandler } from "../../../supabase/functions/vault-import-targets-v1/handler.ts";
import { requireUser, createServiceRoleClient } from "../../../supabase/functions/_shared/auth.ts";
Deno.serve({ hostname: "127.0.0.1", port: 57950 }, createImportHandler({ requireUser, createServiceRoleClient }));
