import "server-only";
import { productionStoreTarget, STORE_PRODUCTION_ORIGIN } from "./storeProductionTarget.mjs";
export const STORE_TRIAL_COOKIE = "grookai_store_trial";
export const STORE_TRIAL_ORIGIN = STORE_PRODUCTION_ORIGIN;
export const storeTrialEnabled = () => productionStoreTarget() && process.env.GROOKAI_STORE_TRIAL_V1 === "true";
export const validStoreTrialCode = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export const storeTrialHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
