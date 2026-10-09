import { vendorPilot, VENDOR_PILOT_DATABASE } from "./vendorPilot.mjs";
export const collectorStaging = process.env.NEXT_PUBLIC_COLLECTOR_STAGING === "true";
export const collectorFixtureLab = process.env.NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB === "true";
export const collectorHostedStaging = process.env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING === "true";
export const storefrontLocalTest = process.env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST === "true";
export const vendorBatchLocalTest = process.env.NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST === "true";
export const collectrImportLocalTest = process.env.NEXT_PUBLIC_COLLECTR_IMPORT_LOCAL_TEST === "true";
export const receiptCloudLocalTest = process.env.NEXT_PUBLIC_RECEIPT_CLOUD_LOCAL_TEST === "true";
export const salesDeskProLocalTest = process.env.NEXT_PUBLIC_SALES_DESK_PRO_LOCAL_TEST === "true";
export const salesCartLocalTest = process.env.NEXT_PUBLIC_SALES_CART_LOCAL_TEST === "true";
export const salesTradeLocalTest = process.env.NEXT_PUBLIC_SALES_TRADE_LOCAL_TEST === "true";
export const copyCostLocalTest = process.env.NEXT_PUBLIC_COPY_COST_LOCAL_TEST === "true";
export const salesNegotiatedTradeLocalTest = process.env.NEXT_PUBLIC_SALES_NEGOTIATED_TRADE_LOCAL_TEST === "true";
export const vendorEventsLocalTest = process.env.NEXT_PUBLIC_VENDOR_EVENTS_LOCAL_TEST === "true";
export const costHistoryLocalTest = process.env.NEXT_PUBLIC_COST_HISTORY_LOCAL_TEST === 'true';
export const priceTargetsLocalTest = process.env.NEXT_PUBLIC_PRICE_TARGETS_LOCAL_TEST === 'true';
export const inventoryExportLocalTest = process.env.NEXT_PUBLIC_INVENTORY_EXPORT_LOCAL_TEST === 'true';
export const portfolioHistoryLocalTest = process.env.NEXT_PUBLIC_PORTFOLIO_HISTORY_LOCAL_TEST === 'true';
export const salesDiscountLocalTest = process.env.NEXT_PUBLIC_SALES_DISCOUNT_LOCAL_TEST === "true";
export const salesPurchaseLocalTest = process.env.NEXT_PUBLIC_SALES_PURCHASE_LOCAL_TEST === "true";
export const salesPaymentsLocalTest = process.env.NEXT_PUBLIC_SALES_PAYMENTS_LOCAL_TEST === "true";
export const receiptDeliveryLocalTest = process.env.NEXT_PUBLIC_RECEIPT_DELIVERY_LOCAL_TEST === "true";

export function assertCollectorStagingTarget(url, fixtureLab = collectorFixtureLab, hosted = collectorHostedStaging) {
  const target = new URL(url);
  if(priceTargetsLocalTest&&(inventoryExportLocalTest||portfolioHistoryLocalTest||vendorPilot||fixtureLab||hosted||storefrontLocalTest||vendorBatchLocalTest||collectrImportLocalTest||receiptCloudLocalTest||salesCartLocalTest||salesDeskProLocalTest||salesTradeLocalTest||receiptDeliveryLocalTest||salesPaymentsLocalTest||copyCostLocalTest||salesPurchaseLocalTest||salesNegotiatedTradeLocalTest||vendorEventsLocalTest||salesDiscountLocalTest||costHistoryLocalTest))throw new Error('Price target proof requires its own local database.');
  if(inventoryExportLocalTest&&(portfolioHistoryLocalTest||vendorPilot||fixtureLab||hosted||storefrontLocalTest||vendorBatchLocalTest||collectrImportLocalTest||receiptCloudLocalTest||salesCartLocalTest||salesDeskProLocalTest||salesTradeLocalTest||receiptDeliveryLocalTest||salesPaymentsLocalTest||copyCostLocalTest||salesPurchaseLocalTest||salesNegotiatedTradeLocalTest||vendorEventsLocalTest||salesDiscountLocalTest||costHistoryLocalTest))throw new Error('Inventory export proof requires its own local database.');
  if(portfolioHistoryLocalTest&&(vendorPilot||fixtureLab||hosted||storefrontLocalTest||vendorBatchLocalTest||collectrImportLocalTest||receiptCloudLocalTest||salesCartLocalTest||salesDeskProLocalTest||salesTradeLocalTest||receiptDeliveryLocalTest||salesPaymentsLocalTest||copyCostLocalTest||salesPurchaseLocalTest||salesNegotiatedTradeLocalTest||vendorEventsLocalTest||salesDiscountLocalTest||costHistoryLocalTest))throw new Error('Portfolio history proof requires its own local database.');
  if(costHistoryLocalTest&&(vendorPilot||fixtureLab||hosted||storefrontLocalTest||vendorBatchLocalTest||collectrImportLocalTest||receiptCloudLocalTest||salesCartLocalTest||salesDeskProLocalTest||salesTradeLocalTest||receiptDeliveryLocalTest||salesPaymentsLocalTest||copyCostLocalTest||salesPurchaseLocalTest||salesNegotiatedTradeLocalTest||vendorEventsLocalTest||salesDiscountLocalTest))throw new Error('Cost history proof requires its own local database.');
  if(salesDiscountLocalTest&&(vendorPilot||fixtureLab||hosted||storefrontLocalTest||vendorBatchLocalTest||collectrImportLocalTest||receiptCloudLocalTest||salesCartLocalTest||salesDeskProLocalTest||salesTradeLocalTest||receiptDeliveryLocalTest||salesPaymentsLocalTest||copyCostLocalTest||salesPurchaseLocalTest||salesNegotiatedTradeLocalTest||vendorEventsLocalTest))throw new Error('Discount proof requires its own local database.');
  if(vendorEventsLocalTest&&(vendorPilot||fixtureLab||hosted||storefrontLocalTest||vendorBatchLocalTest||collectrImportLocalTest||receiptCloudLocalTest||salesCartLocalTest||salesDeskProLocalTest||salesTradeLocalTest||receiptDeliveryLocalTest||salesPaymentsLocalTest||copyCostLocalTest||salesPurchaseLocalTest||salesNegotiatedTradeLocalTest))throw new Error('Event proof requires its own local database.');
  if (salesNegotiatedTradeLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest || collectrImportLocalTest || receiptCloudLocalTest || salesCartLocalTest || salesDeskProLocalTest || salesTradeLocalTest || receiptDeliveryLocalTest || salesPaymentsLocalTest || copyCostLocalTest || salesPurchaseLocalTest)) throw new Error("Negotiated trade proof requires its own local database.");
  if (salesPurchaseLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest || collectrImportLocalTest || receiptCloudLocalTest || salesCartLocalTest || salesDeskProLocalTest || salesTradeLocalTest || receiptDeliveryLocalTest || salesPaymentsLocalTest || copyCostLocalTest)) throw new Error("Purchase proof requires its own local database.");
  if (copyCostLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest || collectrImportLocalTest || receiptCloudLocalTest || salesCartLocalTest || salesDeskProLocalTest || salesTradeLocalTest || receiptDeliveryLocalTest || salesPaymentsLocalTest)) throw new Error("Private cost proof requires its own local database.");
  if (salesPaymentsLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest || collectrImportLocalTest || receiptCloudLocalTest || salesCartLocalTest || salesDeskProLocalTest || salesTradeLocalTest || receiptDeliveryLocalTest)) throw new Error("Split payment proof requires its own local database.");
  if (receiptDeliveryLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest || collectrImportLocalTest || receiptCloudLocalTest || salesCartLocalTest || salesDeskProLocalTest || salesTradeLocalTest)) throw new Error("Receipt delivery proof requires its own local database.");
  if (salesTradeLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest || collectrImportLocalTest || receiptCloudLocalTest || salesCartLocalTest || salesDeskProLocalTest)) throw new Error("Sales trade proof requires its own local database.");
  if (salesDeskProLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest || collectrImportLocalTest || receiptCloudLocalTest || salesCartLocalTest)) throw new Error("Sales desk proof requires its own local database.");
  if (salesCartLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest || collectrImportLocalTest || receiptCloudLocalTest)) throw new Error("Sales cart proof requires its own local database.");
  if (receiptCloudLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest || collectrImportLocalTest)) throw new Error("Receipt cloud proof requires its own local database.");
  if (collectrImportLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest)) throw new Error("Collectr import proof requires its own retained local database.");
  if (vendorBatchLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest)) throw new Error("Batch intake proof requires its own local database.");
  if (vendorPilot && (fixtureLab || hosted || storefrontLocalTest)) throw new Error("Vendor pilot cannot share another staging mode.");
  if (storefrontLocalTest && (fixtureLab || hosted)) throw new Error("Storefront local tests cannot share another staging mode.");
  if (fixtureLab && hosted) throw new Error("Fixture and hosted staging are mutually exclusive.");
  const expected = vendorBatchLocalTest ? (["http://127.0.0.1:27621", "http://127.0.0.1:29021", "http://127.0.0.1:29421", "http://127.0.0.1:30221", "http://127.0.0.1:31021"].includes(target.origin) ? target.origin : "http://127.0.0.1:26421") : vendorPilot ? VENDOR_PILOT_DATABASE : storefrontLocalTest ? "http://127.0.0.1:15439" : hosted ? "https://hcdpcbpnnvtbaezefjkd.supabase.co"
    : fixtureLab ? "http://127.0.0.1:54361" : "http://127.0.0.1:54321";
  const allowed = priceTargetsLocalTest ? 'http://127.0.0.1:36141' : inventoryExportLocalTest ? 'http://127.0.0.1:35941' : portfolioHistoryLocalTest ? 'http://127.0.0.1:35521' : costHistoryLocalTest ? 'http://127.0.0.1:35001' : salesDiscountLocalTest ? "http://127.0.0.1:34601" : vendorEventsLocalTest ? "http://127.0.0.1:34061" : salesNegotiatedTradeLocalTest ? "http://127.0.0.1:33561" : salesPurchaseLocalTest ? "http://127.0.0.1:33281" : copyCostLocalTest ? "http://127.0.0.1:33061" : salesPaymentsLocalTest ? "http://127.0.0.1:32841" : receiptDeliveryLocalTest ? "http://127.0.0.1:32701" : salesTradeLocalTest ? "http://127.0.0.1:65301" : salesDeskProLocalTest ? "http://127.0.0.1:65001" : salesCartLocalTest ? "http://127.0.0.1:64801" : receiptCloudLocalTest ? "http://127.0.0.1:64701" : collectrImportLocalTest ? (["http://127.0.0.1:58681", "http://127.0.0.1:58721", "http://127.0.0.1:33701"].includes(target.origin) ? target.origin : "http://127.0.0.1:58541") : expected;
  if (target.origin !== allowed || target.username || target.password || target.search || target.hash) {
    throw new Error("Authenticated collector staging requires its exact verified database.");
  }
  if (target.pathname !== "/") throw new Error("Unexpected staging database path.");
}
