enum ConditionGrade { nm, lp, mp, hp, dmg, graded }

extension ConditionGradeX on ConditionGrade {
  String get label {
    switch (this) {
      case ConditionGrade.nm:
        return 'NM';
      case ConditionGrade.lp:
        return 'LP';
      case ConditionGrade.mp:
        return 'MP';
      case ConditionGrade.hp:
        return 'HP';
      case ConditionGrade.dmg:
        return 'DMG';
      case ConditionGrade.graded:
        return 'GRADED';
    }
  }

  static ConditionGrade fromScore(double s) {
    if (s >= 92) return ConditionGrade.nm;
    if (s >= 80) return ConditionGrade.lp;
    if (s >= 65) return ConditionGrade.mp;
    if (s >= 50) return ConditionGrade.hp;
    return ConditionGrade.dmg;
  }
}

class ConditionOutput {
  final double score; // 0–100
  final ConditionGrade grade;
  final double confidence; // 0–1
  final Map<String, double> metrics; // e.g., {'centering': 0.9, 'edgeWear': 0.2}
  final List<String> notes; // brief flags
  const ConditionOutput({
    required this.score,
    required this.grade,
    required this.confidence,
    this.metrics = const {},
    this.notes = const [],
  });

  Map<String, dynamic> toJson() => {
        'score': score,
        'grade': grade.label,
        'confidence': confidence,
        'metrics': metrics,
        'notes': notes,
      };
}

