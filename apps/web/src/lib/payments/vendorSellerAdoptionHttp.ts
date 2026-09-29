import { SELLER_NO_STORE } from "./vendorSellerHandlers.ts";
import { readBillingBody } from "../billing/vendorBillingHttp.ts";
import type { AdoptionOwner } from "./vendorSellerAdoption.ts";
import type { createSellerAdoptionService } from "./vendorSellerAdoptionService.ts";

export function createSellerAdoptionHandlers(deps: {
  authenticate(): Promise<AdoptionOwner | null>; origin(): string;
  service(): ReturnType<typeof createSellerAdoptionService> | null;
}) {
  const json = (body: unknown, status = 200) => Response.json(body, {status, headers:SELLER_NO_STORE});
  const unavailable = () => json({error:"The existing seller connection could not be verified. Please try again."},503);
  return {
    async GET() {
      try {
        const owner = await deps.authenticate();
        if (!owner) return json({error:"Sign in required."},401);
        const service = deps.service();
        return json({available:service ? await service.available(owner.id) : false});
      } catch { return unavailable(); }
    },
    async POST(request: Request) {
      try {
        if (request.headers.get("origin") !== deps.origin()) return json({error:"Invalid request origin."},403);
        const owner = await deps.authenticate();
        if (!owner) return json({error:"Sign in required."},401);
        let body;
        try { body = JSON.parse(await readBillingBody(request,256)); } catch { return json({error:"Invalid seller request."},400); }
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length!==1 || body.action!=="connect")
          return json({error:"Invalid seller request."},400);
        const service = deps.service(); if (!service) return unavailable();
        return json(await service.connect(owner));
      } catch { return unavailable(); }
    },
  };
}
