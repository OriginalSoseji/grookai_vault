import GoogleSignInButton from "@/components/GoogleSignInButton";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function VaultPage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center py-10">
        <section className="w-full max-w-2xl space-y-4 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Vault (Authenticated)</h1>
          <p className="text-base leading-7 text-slate-600">Your account is connected.</p>
          <p className="text-sm text-slate-600">Vault tools are still under construction.</p>
          <p className="text-sm text-slate-600">This confirms authentication is working.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-10">
      <section className="w-full max-w-2xl space-y-10 text-center">
        <div className="space-y-5">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Vault is coming.</h1>
          <p className="text-base leading-7 text-slate-600">
            Track your collection, organize cards with permanent Grookai IDs, and prepare for public showcases and
            trading.
          </p>
        </div>

        <div className="space-y-5">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">What Vault will enable</h2>
          <ul className="mx-auto max-w-md space-y-3 text-left text-sm leading-6 text-slate-700">
            <li className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-900" aria-hidden="true" />
              <span>Track your personal card collection</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-900" aria-hidden="true" />
              <span>Organize cards using permanent Grookai IDs</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-900" aria-hidden="true" />
              <span>Share collections publicly</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-900" aria-hidden="true" />
              <span>Prepare for vendor and trading tools</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-base font-semibold text-slate-900">The catalog you see today is the foundation.</p>
            <p className="text-sm text-slate-600">Vault tools are coming soon.</p>
          </div>
          <div className="flex justify-center">
            <GoogleSignInButton
              label="Sign in with Google"
              nextPath="/vault"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            />
          </div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            Catalog available now. Vault tools coming soon.
          </p>
        </div>
      </section>
    </div>
  );
}
