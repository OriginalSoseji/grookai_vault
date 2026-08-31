#!/usr/bin/env node

import { runOperationsMaintenanceV1 } from "../../backend/operations/operations_control_plane_v1.mjs";

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

if (!hasFlag("--run")) {
  throw new Error("Refusing to mutate operational state without explicit --run");
}

const supabaseUrl = String(process.env.SUPABASE_URL ?? "").trim();
const serviceRoleKey = String(process.env.SUPABASE_SECRET_KEY ?? "").trim();
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

const result = await runOperationsMaintenanceV1({
  supabaseUrl,
  serviceRoleKey,
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
