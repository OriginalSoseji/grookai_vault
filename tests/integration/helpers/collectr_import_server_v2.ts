import { createCollectionImportHandler } from "../../../supabase/functions/vault-import-collection-v2/handler.ts";
import { requireUser, createServiceRoleClient } from "../../../supabase/functions/_shared/auth.ts";
Deno.serve({ hostname: "127.0.0.1", port: 58750 }, createCollectionImportHandler({ requireUser, createServiceRoleClient }));
