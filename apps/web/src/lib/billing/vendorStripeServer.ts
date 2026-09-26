import "server-only";
import { createVendorStripeClient, readVendorBillingConfig } from "./vendorStripeGateway";

// The only environment-reading entry point. Keep credentials out of client
// components, capability DTOs, mobile configuration and static build evaluation.
// Authenticated handlers use the durable account/lease boundary before any
// provider mutation; constructing this client grants nothing.
export function getVendorBillingServer() {
  const config = readVendorBillingConfig(process.env);
  if (!config) return null;
  return { config, stripe: createVendorStripeClient(config) };
}
