import type { SupabaseClient } from "@supabase/supabase-js";
import { getBinderContinuation } from "@/lib/binders/rpc";
import { BinderContinuationView } from "./BinderContinuationView";

export async function BinderContinuation({ ownerId, supabase }: {
  ownerId: string;
  supabase: SupabaseClient;
}) {
  try {
    const continuation = await getBinderContinuation(supabase);
    return <BinderContinuationView key={ownerId} ownerId={ownerId} continuation={continuation} />;
  } catch {
    return <BinderContinuationView key={ownerId} ownerId={ownerId} continuation={null} />;
  }
}
