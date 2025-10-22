export const MODEL = Deno.env.get('SCAN_EMBED_MODEL') ?? 'clip-vit-b32'
export const TIMEOUT_MS = parseInt(Deno.env.get('SCAN_EMBED_TIMEOUT_MS') ?? '3500')
export const WEIGHTS = {
  wE: parseFloat(Deno.env.get('SCAN_W_EMBED') ?? '0.70'),
  wN: parseFloat(Deno.env.get('SCAN_W_NUM') ?? '0.25'),
  wT: parseFloat(Deno.env.get('SCAN_W_TEXT') ?? '0.05'),
}
export const CONF_STRONG = parseFloat(Deno.env.get('SCAN_CONF_STRONG') ?? '0.95')
export const CONF_ACCEPT = parseFloat(Deno.env.get('SCAN_CONF_ACCEPT') ?? '0.90')

