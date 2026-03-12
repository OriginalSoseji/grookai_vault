import { redirect } from "next/navigation";
import { ImportClient } from "@/app/vault/import/ImportClient";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VaultImportPage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/vault/import");
  }

  return <ImportClient />;
}
