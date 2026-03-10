export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Information</p>
        <h1 className="text-3xl font-semibold text-slate-950">Legal</h1>
      </div>

      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-7 text-sm leading-7 text-slate-700 shadow-sm">
        <p>Pokémon and Pokémon TCG are trademarks of Nintendo, Creatures Inc., and GAME FREAK.</p>
        <p>
          Grookai Vault is an independent collector tool and is not affiliated with, endorsed by, or sponsored by
          The Pokémon Company, Nintendo, Creatures Inc., or GAME FREAK.
        </p>
        <p>
          Card images and artwork are © Pokémon / Nintendo / Creatures / GAME FREAK and are displayed for
          identification and informational purposes only.
        </p>
        <p>
          Card data provided on this site is intended for informational use. While we strive for accuracy, some
          details may occasionally be incomplete or incorrect.
        </p>
      </div>
    </div>
  );
}
