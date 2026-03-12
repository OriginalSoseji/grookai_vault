import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  return (
    <div className="space-y-8 py-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Grookai Account</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Your account surface</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            This is the current account placeholder for authenticated navigation. It keeps account access distinct from
            Vault while the broader account/settings surface is expanded.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Signed in</h2>
          <p className="mt-3 text-sm text-slate-600">Email</p>
          <p className="mt-1 text-base font-medium text-slate-900">{user.email ?? "Email unavailable"}</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Quick Links</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              href="/vault"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-slate-800"
            >
              View Vault
            </Link>
            <Link
              href="/wall"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              View Wall
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
