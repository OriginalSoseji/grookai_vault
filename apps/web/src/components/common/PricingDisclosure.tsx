export default function PricingDisclosure() {
  return (
    <section className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pricing &amp; Data Sources</h3>

      <p className="mb-2">Pricing is shown only when Grookai has an approved current Market Evidence Engine signal.</p>

      <p className="mb-2">
        Active listing estimates are asking-price evidence, not sold-comparable proof or guaranteed market value.
      </p>

      <p>
        Pricing data may be delayed and is not guaranteed to reflect real-time market conditions.
      </p>
    </section>
  );
}
