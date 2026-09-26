import type { VisualReferenceV24 } from './scanVisualProcessV24.mjs';
export type FeatureReferenceV29 = { id: string; imageSha256: string; artifactSha256: string; bytes: number };
export const FEATURE_MANIFEST_PINS: Readonly<{ sha256: string; bytes: number; decodedBytes: number }>;
export function validateFeatureManifestV29(value: unknown, byId: Map<string, VisualReferenceV24>): Map<string, FeatureReferenceV29>;
export function loadFeatureManifestV29(file: string | URL, byId: Map<string, VisualReferenceV24>): Map<string, FeatureReferenceV29>;
export function featureManifestV29(byId: Map<string, VisualReferenceV24>): Map<string, FeatureReferenceV29>;
