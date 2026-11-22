export type PricingRecoveryResult = {status: string; checked: number; updated: number; runId?: string; waiting?: number; squareReady?: number; squarePending?: number; failed?: number; errorCode?: string};
export function runVendorPricingRecovery(options?: Record<string, unknown>): Promise<PricingRecoveryResult>;
