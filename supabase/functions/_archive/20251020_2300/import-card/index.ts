/**
 * Archived copy of import-card function.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

type ReqBody = { set_code: string; number: string; lang?: string }

const url = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!
const supabase = createClient(url, serviceRoleKey)

serve(async (req) => new Response(JSON.stringify({ status: "archived" })))
