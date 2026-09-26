import { readBillingBody } from "../billing/vendorBillingHttp.ts";
import { BillingError } from "../billing/vendorBillingRepository.ts";
import { AcquisitionError } from "./orderAcquisitionService.ts";
import type { createAcquisitionService } from "./orderAcquisitionService.ts";
import { acquisitionUuid, purchaseSelection } from "./orderAcquisitionTypes.ts";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization", "Referrer-Policy": "no-referrer" } });
export function createAcquisitionHandlers(deps: { authenticate(): Promise<string | null>; origin(): string; service(): ReturnType<typeof createAcquisitionService> | null }) {
  return async (request: Request) => {
    try {
      if (request.method !== "POST") return json({ error: "POST required." }, 405);
      if (request.headers.get("origin") !== deps.origin()) return json({ error: "Invalid request origin." }, 403);
      const buyer = await deps.authenticate();if (!buyer) return json({ error: "Sign in required." }, 401);
      let body;
      try { body = JSON.parse(await readBillingBody(request, 3072)); } catch (e) { return json({ error: "Invalid purchase request." }, e instanceof BillingError && e.code === "billing_body_too_large" ? 413 : 400); }
      if (!body || typeof body !== "object" || Array.isArray(body) || new URL(request.url).search) return json({ error: "Invalid purchase request." }, 400);
      const keys = Object.keys(body).sort().join(",");
      if (body.action === "quote") {
        if (keys !== "action,itemId,kind,quantity,requestId,storeId" || typeof body.requestId !== "string" || !acquisitionUuid.test(body.requestId)) return json({ error: "Invalid purchase selection." }, 400);
        try { purchaseSelection(body); } catch { return json({ error: "Invalid purchase selection." }, 400); }
      } else if (!["confirm", "cancel"].includes(body.action) || keys !== "action,token" || typeof body.token !== "string" || body.token.length > 2048) return json({ error: "Invalid confirmation." }, 400);
      const service = deps.service();if (!service) return json({ error: "Online ordering is not available yet." }, 503);
      if (body.action === "quote") return json(await service.quote(buyer, { ...purchaseSelection(body), requestId: body.requestId }));
      return json(await service[body.action as "confirm" | "cancel"](buyer, body.token));
    } catch (e) {
      const code = e instanceof AcquisitionError ? e.code : "";
      if (["quote_invalid"].includes(code)) return json({ error: "This quote is unavailable for your account. Request a new quote." }, 400);
      if (["quote_expired", "stock_reservation_expired"].includes(code)) return json({ error: "This quote expired or was released. Start a new review to check current availability." }, 409);
      if (["stock_unavailable", "stock_buyer_limit", "stock_request_conflict"].includes(code)) return json({ error: "This selection is unavailable. Review your existing orders before starting again." }, 409);
      return json({ error: "The purchase could not be completed. Retry this request or check Your purchases before starting again." }, 503);
    }
  };
}
