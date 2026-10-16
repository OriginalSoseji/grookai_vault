export const CARD_PROFIT_SETTINGS_KEY: string;

export function readIncomeTaxBps(
    storage: Pick<Storage, "getItem">,
    fallback?: number,
): number;

export function writeIncomeTaxBps(
    storage: Pick<Storage, "setItem">,
    value: number,
): boolean;
