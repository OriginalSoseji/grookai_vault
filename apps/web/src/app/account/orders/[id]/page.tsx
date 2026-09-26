import Link from "next/link";
import ContinueOrderPayment from "@/components/orders/ContinueOrderPayment";
import CancelOrderButton from "@/components/orders/CancelOrderButton";
import OrderFulfillment from "@/components/orders/OrderFulfillment";
import OrderRefunds from "@/components/orders/OrderRefunds";
import OrderResolutions from "@/components/orders/OrderResolutions";
import { readResolutions } from "@/lib/orders/orderResolutions";
import { canOfferResolution } from "@/lib/orders/orderResolutionsRuntime";
import { readRefunds } from "@/lib/orders/orderRefunds";
import { refundControls } from "@/lib/orders/orderRefundsRuntime";
import { readFulfillment } from "@/lib/orders/orderFulfillment";
import { canOfferFulfillment } from "@/lib/orders/orderFulfillmentRuntime";
import { readCancellation } from "@/lib/orders/orderCancellation";
import { canOfferCancellation } from "@/lib/orders/orderCancellationRuntime";
import { orderPaymentAvailable } from "@/lib/orders/orderPaymentAvailability";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { orderMoney, orderPresentation, readOrder, validOrderId } from "@/lib/orders/orderHistory";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Order details | Grookai Vault", robots: { index: false, follow: false } };
export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params, returned = (await searchParams).checkout === "returned";
  const href = validOrderId(id) ? `/account/orders/${id.toLowerCase()}` : "/account/orders";
  const { supabase, user } = await requireServerUser(`${href}${returned ? "?checkout=returned" : ""}`);
  let order: Awaited<ReturnType<typeof readOrder>> = null, failure = false;
  try { order = await readOrder(supabase, id); } catch { failure = true; }
  const cancellation = order ? await readCancellation(supabase, order.id).catch(() => null) : null;
  let status = order ? cancellation?.canceledAt && !order.paid && !order.needsReview && order.stockState === "released" ? { label: "Order canceled", tone: "closed", message: "This order was canceled before checkout started. Its inventory hold was released." } : orderPresentation(order) : null;
  const canPay = order ? await orderPaymentAvailable(order, user.id) : false;
  const fulfillment = order ? await readFulfillment(supabase, order.id).catch(() => null) : null;
  const refunds = order ? await readRefunds(supabase, order.id).catch(() => null) : null;
  const resolutions = order?.paid ? await readResolutions(supabase, order.id).catch(() => null) : null;
  if (order?.paid && !order.needsReview && refunds && !refunds.uncertain) {
    if (refunds.succeededMinor === order.totalAmountMinor) status = { label: "Fully refunded", tone: "closed", message: "A full refund was sent to the original payment method. Your bank may take additional time to show it." };
    else if (refunds.pendingMinor > 0) status = { label: "Refund pending", tone: "review", message: "A refund has been requested and is still being processed. Its recorded status is shown below." };
    else if (refunds.succeededMinor > 0) status = { label: "Partially refunded", tone: "closed", message: "A partial refund was sent to the original payment method. Its recorded amount is shown below." };
  }
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <nav aria-label="Order navigation" className="flex flex-wrap gap-4 text-sm font-semibold"><Link href="/account/orders">Your purchases</Link><Link href="/account/store/orders">Store orders</Link><Link href="/account">Account</Link></nav>
    <h1 className="text-3xl font-bold text-slate-950">Order details</h1>
    {!order || !status ? <section role={failure ? "alert" : undefined} className="space-y-3 rounded-xl border border-slate-200 p-6"><h2 className="font-semibold">{failure ? "Order could not be loaded" : "Order unavailable"}</h2><p className="text-sm text-slate-600">{failure ? "Try loading this page again." : "This order is unavailable for the signed-in account."}</p>{failure && <a href={href} className="text-sm underline">Reload order</a>}</section> : <>
      {returned && <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">You have returned from checkout. Your recorded payment status is shown below; returning here does not confirm payment.</p>}
      {canPay && <ContinueOrderPayment orderId={order.id} />}
      {cancellation?.canCancel && canOfferCancellation() && <CancelOrderButton orderId={order.id} />}
      <section className={`space-y-3 rounded-xl border p-6 ${status.tone === "review" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}><h2 className="text-xl font-semibold">{status.label}</h2><p className="text-sm text-slate-700">{status.message}</p>{order.needsReview && <p className="text-sm font-medium">{order.paid ? "A payment was recorded for this order." : "Payment has not been confirmed."}</p>}<a href={href} className="inline-block text-sm font-semibold text-emerald-800 underline">Reload order status</a></section>
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6"><div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{order.kind === "copy" ? "Exact copy" : "Custom collectible"}</p><h2 className="break-words text-xl font-semibold">{order.title}</h2>{order.kind === "copy" && <p className="text-sm text-slate-600">{order.format} · {order.condition || "Condition not recorded"}</p>}<p className="text-sm text-slate-600">Details and prices recorded when the order was created.</p></div>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 text-sm"><dt>Quantity</dt><dd className="text-right">{order.quantity}</dd><dt>Unit price</dt><dd>{orderMoney(order.unitAmountMinor)}</dd><dt>Items</dt><dd>{orderMoney(order.quantity * order.unitAmountMinor)}</dd><dt>Shipping</dt><dd>{orderMoney(order.shippingAmountMinor)}</dd><dt>Tax</dt><dd>{orderMoney(order.taxAmountMinor)}</dd><dt className="border-t pt-3 font-semibold">Order total</dt><dd className="border-t pt-3 font-semibold">{orderMoney(order.totalAmountMinor)} USD</dd></dl>
      </section>
      <OrderFulfillment value={fulfillment} updatesEnabled={canOfferFulfillment()} />
      {order.paid && <OrderRefunds value={refunds} controls={refundControls()} />}
      {order.paid && <OrderResolutions value={resolutions} enabled={canOfferResolution()} />}
      <footer className="space-y-2 text-xs text-slate-500"><p className="break-all">Order {order.id}</p><p>Created <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</time></p><p>Order access remains available after a subscription or store publication changes.</p></footer>
    </>}
  </main>;
}
