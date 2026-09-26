export type VisualReferenceV24 = { id: string; gv_id: string; image_path: string; sha256: string };
export type VisualPacketV24 = { id: string; bytes: Uint8Array };
export type VisualResultV24 = { version: string; status: string; candidates: { id: string; rotation: number }[]; references: Omit<VisualReferenceV24, "sha256">[] };
export function runVisualProcessV24(entry: string | URL, bytes: Uint8Array, options: {
  byId: Map<string, VisualReferenceV24>;
  featureManifest?: Map<string, import('./scanFeatureManifestV29.mjs').FeatureReferenceV29>;
  loadReferences: (ids: string[], options: { signal: AbortSignal }) => Promise<VisualPacketV24[]>;
  timeoutMs?: number; signal?: AbortSignal;
  onProgress?: (progress: { stage: string; ms: number }) => void;
  onResources?: (resources: { version: string; platform: string; outcome: string; intervalMs: number; samples: number; elapsedMs: number; parentPeakRssBytes: number; parentFinalRssBytes: number | null; childPeakRssBytes: number | null; parentLifetimeHighWaterBytes: number | null; childHighWaterBytes: number | null; combinedPeakRssBytes: number | null; containerPeakObservedBytes: number | null; containerLimitBytes: number | null }) => void;
}): Promise<VisualResultV24>;
