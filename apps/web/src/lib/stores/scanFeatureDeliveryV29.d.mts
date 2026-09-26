import type { VisualReferenceV24, VisualPacketV24 } from './scanVisualProcessV24.mjs';
import type { FeatureReferenceV29 } from './scanFeatureManifestV29.mjs';
export const FEATURE_BUCKET_V29: string;
export function featurePathV29(row: FeatureReferenceV29): string;
export function validateFeaturePacketsV29(packets: unknown, ids: string[], byId: Map<string, VisualReferenceV24>, manifest: Map<string, FeatureReferenceV29>): VisualPacketV24[];
export function createFeatureDeliveryV29(options: {
  byId: Map<string, VisualReferenceV24>; manifest: Map<string, FeatureReferenceV29>; origin: string;
  authorize: (rows: VisualReferenceV24[], signal: AbortSignal) => Promise<string[]>;
  sign: (rows: FeatureReferenceV29[], signal: AbortSignal) => Promise<string[]>;
  fetchFeature?: typeof fetch;
}): (ids: string[], options: { signal: AbortSignal }) => Promise<VisualPacketV24[]>;
