import {NextResponse} from "next/server";
import {getPokemonPlayables} from "@/lib/playables/getPokemonPlayables";

export async function GET() {
  const snapshot = await getPokemonPlayables();
  if (!snapshot) return NextResponse.json({ok: false, error: "Current playables are temporarily unavailable."},
    {status: 503, headers: {"Cache-Control": "no-store"}});
  return NextResponse.json({ok: true, ...snapshot,
    definition: "Repeated appearance in completed published Standard decklists dated within the last 30 days.",
    source_attribution: {label: "Published Standard decklists from Limitless; TCGdex metadata", url: "https://play.limitlesstcg.com"}},
  {headers: {"Cache-Control": "no-store"}});
}
