export const VISUAL_VERSION: string;
export const MAX_SCAN_BYTES: number;
export type VisualReference = { id: string; gv_id: string; image_path: string; sha256: string; descriptor: string };
export type PreparedReference = VisualReference & { feature: { bytes: Uint8Array; gray: Float32Array } };
export function scanDescriptor(bytes: Uint8Array, rotation?: number): Promise<string>;
export function scoreVisualScan(descriptor: string, references: PreparedReference[]): { id: string; distance: number }[];
export function prepareVisualIndex(artifact: { version: string; references: VisualReference[] }): PreparedReference[];
export function rankVisualScan(descriptor: string, references: PreparedReference[]): { status: string; candidates: { id: string; distance: number }[] };
