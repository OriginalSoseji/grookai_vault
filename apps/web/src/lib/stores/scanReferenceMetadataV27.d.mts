import type { VisualReferenceV24 } from './scanVisualProcessV24.mjs';
export const METADATA_SOURCE_SHA256: string;
export const METADATA_SHA256: string;
export const METADATA_BYTES: number;
export function loadReferenceMetadataV27(file: string | URL): Map<string, VisualReferenceV24>;
export function validateMetadataEnvelopeV27(value: unknown): Map<string, VisualReferenceV24>;
export function visualReferenceMetadataV27(): Map<string, VisualReferenceV24>;
