import Link from "next/link";
import type { JungleEditionResolution } from "@/lib/cards/jungleEditionResolution";

export default function JungleEditionChoices({ resolution }: { resolution: JungleEditionResolution }) {
  if (resolution.status === "not_applicable" || resolution.status === "ready") return null;
  return <section aria-label="Choose card edition" className="gv-action-panel space-y-3 p-5">
    <h2 className="font-semibold">Edition unconfirmed</h2>
    <p className="text-sm">Your saved copies stay as they are. Choose the edition on your card before adding another copy. The catalog photo does not confirm its edition.</p>
    {resolution.status === "selection_required" && resolution.options.length === 2 ? <div className="flex flex-wrap gap-3">
      {resolution.options.map(option => <Link key={option.card_print_id}
        className="rounded-lg border px-4 py-2 text-sm font-semibold"
        href={`/card/${encodeURIComponent(option.gv_id)}?printing=${encodeURIComponent(option.printing_gv_id)}`}>
        {option.edition === "first_edition" ? "First Edition" : "Unlimited"} · {option.finish_key === "holo" ? "Holo" : "Normal"}
      </Link>)}
    </div> : <p className="text-sm">Edition choices are being reviewed. Your saved copies remain available.</p>}
  </section>;
}
