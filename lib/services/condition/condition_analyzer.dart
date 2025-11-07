import 'dart:math';
import 'dart:ui' as ui;
import '../../models/condition.dart';
import 'image_metrics.dart';

class ConditionAnalyzer {
  Future<ConditionOutput> analyze(ui.Image img, {bool assumeHolo = false}) async {
    final centering = await ImageMetrics.estimateCentering(img); // higher is better
    final edgeWear = await ImageMetrics.estimateEdgeWear(img); // higher is better
    final corner = await ImageMetrics.estimateCornerWear(img); // higher is better
    final surface = await ImageMetrics.estimateSurfaceClean(img); // higher is better
    final crease = await ImageMetrics.estimateCreaseRisk(img); // higher is better

    // Weighting: emphasize corners/edges/surface; centering lighter for raw.
    final weights = <String, double>{
      'centering': 0.15,
      'edge': 0.30,
      'corner': 0.25,
      'surface': 0.25,
      'crease': 0.05,
    };

    double score =
        centering * weights['centering']! * 100 +
        edgeWear * weights['edge']! * 100 +
        corner * weights['corner']! * 100 +
        surface * weights['surface']! * 100 +
        crease * weights['crease']! * 100;

    // Holo penalty if surface is low (scratches show more on holos)
    if (assumeHolo && surface < 0.75) {
      score -= 4.0;
    }
    score = score.clamp(0, 100);

    // Confidence heuristic: agreement among metrics
    final vals = [centering, edgeWear, corner, surface, crease];
    final mean = vals.reduce((a, b) => a + b) / vals.length;
    final varSum = vals.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b) / vals.length;
    final spread = sqrt(varSum);
    final confidence = (1.0 - spread).clamp(0.4, 0.98); // keep floor in dev

    final grade = ConditionGradeX.fromScore(score);
    final notes = <String>[
      if (centering < 0.8) 'Centering off',
      if (edgeWear < 0.75) 'Edge wear',
      if (corner < 0.75) 'Corner whitening',
      if (surface < 0.7) 'Surface scratches',
      if (crease < 0.8) 'Possible crease',
    ];

    return ConditionOutput(
      score: score,
      grade: grade,
      confidence: confidence,
      metrics: {
        'centering': centering,
        'edgeWear': edgeWear,
        'cornerWear': corner,
        'surfaceClean': surface,
        'creaseRisk': crease,
      },
      notes: notes,
    );
  }
}

