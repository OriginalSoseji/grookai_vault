export const STORE_PRODUCTION_DATABASE: string;
export const STORE_PRODUCTION_ORIGIN: string;
export function productionStoreTarget(env?: Record<string, string | undefined>): boolean;
export function storeBatchTarget(operation: 'commit' | 'cancel', env?: Record<string, string | undefined>): boolean;
