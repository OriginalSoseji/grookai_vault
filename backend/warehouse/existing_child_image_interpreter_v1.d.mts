import type { WarehouseInterpreterPackage } from '../../apps/web/src/lib/warehouse/buildWarehouseInterpreterV1';
export function buildExistingChildImageInterpreterV1(input: {
  candidate: { id: string; state: string; submission_intent: string; proposed_action_type: string | null };
  classificationPackage: Record<string, unknown> | null;
  metadataPackage: Record<string, unknown> | null;
  canonContext: WarehouseInterpreterPackage['canon_context'];
  hasFrontEvidence: boolean;
  evidenceGaps?: string[];
  variantIdentity?: WarehouseInterpreterPackage['variant_identity'];
}): WarehouseInterpreterPackage | null;
