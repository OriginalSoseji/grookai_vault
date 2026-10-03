import { redirect } from "next/navigation";
import { receiptDestination, receiptSaleId } from "@/lib/receipts/receiptSale";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

export default async function StartReceiptPage({ searchParams }: { searchParams: Promise<{ sale?: string | string[] }> }) {
  const { sale } = await searchParams;
  if (sale !== undefined && !receiptSaleId(sale)) return <p className="p-6">This recorded-sale link is invalid.</p>;
  // Destination pages authenticate the owner and load the sale. This route has no data access.
  redirect(receiptDestination(process.env.GROOKAI_RECEIPT_CLOUD_ENABLED === "true", sale));
}
