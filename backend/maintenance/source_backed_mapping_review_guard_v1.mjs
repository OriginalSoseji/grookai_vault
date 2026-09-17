import { assertLegacyMappingReviewOnly } from './legacy_mapping_review_only_v1.mjs';

// Evaluated before the legacy CLI can load environment or construct clients.
assertLegacyMappingReviewOnly();
