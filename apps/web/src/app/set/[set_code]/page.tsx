import { redirect } from "next/navigation";

export const revalidate = 300;

export default async function SetRedirectPage(
  props: {
    params: Promise<{ set_code: string }>;
  }
) {
  const params = await props.params;
  redirect(`/sets/${encodeURIComponent(params.set_code)}`);
}
