import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireServerUser } from "@/lib/auth/requireServerUser";
export const dynamic = "force-dynamic";
export default async function NewCustomImport() {
  await requireServerUser("/account/store/import");
  redirect(`/account/store/import/${randomUUID()}`);
}
