import OrderHistory from "@/components/orders/OrderHistory";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Store orders | Grookai Vault", robots: { index: false, follow: false } };
export default function StoreOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <OrderHistory role="seller" searchParams={searchParams} />;
}
