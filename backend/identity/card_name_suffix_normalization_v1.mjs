const SUPPORTED_SUFFIXES = new Set(["EX", "GX"]);

export function normalizeTerminalCardSuffix(value, suffix, separator) {
  const text = String(value ?? "");
  const normalizedSuffix = String(suffix ?? "").toUpperCase();
  if (!SUPPORTED_SUFFIXES.has(normalizedSuffix)) {
    throw new Error(`unsupported_terminal_card_suffix:${normalizedSuffix}`);
  }
  if (separator !== " " && separator !== "-") {
    throw new Error(`unsupported_terminal_card_suffix_separator:${separator}`);
  }
  if (!text.toUpperCase().endsWith(normalizedSuffix)) return text;

  const baseWithDelimiter = text.slice(0, -normalizedSuffix.length);
  if (!/[\s-]$/.test(baseWithDelimiter)) return text;

  const base = baseWithDelimiter.replace(/[\s-]+$/g, "");
  return base ? `${base}${separator}${normalizedSuffix}` : text;
}
