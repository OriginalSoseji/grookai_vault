# Condition Spec (Dev)
Inputs: full card image.
Metrics (0..1 higher=better):
- centering, edgeWear, cornerWear, surfaceClean, creaseRisk
Score: weighted sum → 0..100.
Grade thresholds: NM ≥92, LP 80–91.9, MP 65–79.9, HP 50–64.9, DMG <50.
Confidence: 1 - stddev(metrics) (bounded 0.4..0.98).
Upgrade path: replace stubs in image_metrics.dart with ML (TFLite) or classical filters; keep same API.

