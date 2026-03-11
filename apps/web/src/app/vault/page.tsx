import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function VaultPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center py-10">
      <section className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Vault is coming.</h1>
          <p className="text-base leading-7 text-slate-600">
            Track your collection, organize cards by permanent Grookai IDs, and prepare for public showcases and
            trading.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">What Vault will unlock</h2>
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            <li>Track your personal card collection</li>
            <li>Organize cards using permanent Grookai IDs</li>
            <li>Share collections publicly</li>
            <li>Prepare for future vendor and trading tools</li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">The catalog you see today is the foundation.</p>
          <p className="text-sm text-slate-600">Vault tools are coming soon.</p>
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
