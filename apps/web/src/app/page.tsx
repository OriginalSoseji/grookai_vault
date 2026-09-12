import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Home enters the same collector workspace as the approved preview.
export default async function Home({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries((await searchParams) ?? {})) {
    if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
    else if (value !== undefined) query.set(key, value);
  }
  redirect(query.size ? `/explore?${query.toString()}` : "/explore");
}
