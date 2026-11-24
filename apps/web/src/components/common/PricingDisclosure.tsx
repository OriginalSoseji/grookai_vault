export default function PricingDisclosure() {
  return (
    <section className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pricing &amp; Data Sources</h3>

      <p className="mb-2">
        The headline price is TCGPlayer&apos;s latest qualified market price for the selected exact printing and finish.
      </p>

      <p className="mb-2">
        Lowest Available Today uses exact-printing eBay active asks and remains separate from the market close.
      </p>

      <p>
        Older prices remain visible with their original last-updated date until a newer qualified price is available.
        Pricing is withheld when the exact printing is uncertain or the finish does not match.
      </p>
    </section>
  );
}
