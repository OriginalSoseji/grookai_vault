// Model adapter (placeholder). Swap implementation per provider.
// Expose a single async function to produce a 768-dim embedding from image bytes.

export async function embedImage(bytes: Uint8Array): Promise<number[]> {
  // TODO: Plug in the chosen model/provider here.
  // For now, return a tiny dummy vector to keep pipeline wired.
  const out = new Array(768).fill(0).map((_, i) => ((bytes[i % bytes.length] ?? 0) % 7) / 1000)
  return out
}

