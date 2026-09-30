import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createServiceRoleClient, requireUser } from "../_shared/auth.ts";
import { createCollectionImportHandler } from "./handler.ts";
serve(createCollectionImportHandler({ requireUser, createServiceRoleClient }));
