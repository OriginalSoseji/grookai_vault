import { redirect } from "next/navigation";

export const revalidate = 300;

export default async function SetRedirectPage({
  params,
}: {
  params: { set_code: string };
}) {
  redirect(`/sets/${encodeURIComponent(params.set_code)}`);
}
