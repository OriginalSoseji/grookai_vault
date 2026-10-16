export const CARD_PROFIT_SETTINGS_KEY = "grookai.card-profit.settings.v1";

export function readIncomeTaxBps(storage, fallback = 2500) {
  try {
    const value = Number(storage.getItem(CARD_PROFIT_SETTINGS_KEY));
    return Number.isInteger(value) && value >= 0 && value <= 10000 ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeIncomeTaxBps(storage, value) {
  if (!Number.isInteger(value) || value < 0 || value > 10000) return false;
  try {
    storage.setItem(CARD_PROFIT_SETTINGS_KEY, String(value));
    return true;
  } catch {
    return false;
  }
}
