import CardProfitabilityManager from "@/components/sales/CardProfitabilityManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Per-card P&L | Grookai Vault", robots: { index: false, follow: false } };

export default function CardProfitabilityPage() {
  return <CardProfitabilityManager />;
}
