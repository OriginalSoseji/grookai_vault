import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createServiceRoleClient } from "../_shared/auth.ts";
import { createMarketplaceLinksHandler } from "./handler.ts";

serve(createMarketplaceLinksHandler(createServiceRoleClient));
