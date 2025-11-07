import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/condition.dart';
import 'package:grookai_vault/services/condition/condition_analyzer.dart';

void main() {
  test('ConditionAnalyzer constructs', () async {
    final a = ConditionAnalyzer();
    expect(a, isNotNull);
  });

  test('Grade mapping sanity', () {
    expect(ConditionGradeX.fromScore(96).label, 'NM');
    expect(ConditionGradeX.fromScore(85).label, 'LP');
    expect(ConditionGradeX.fromScore(70).label, 'MP');
    expect(ConditionGradeX.fromScore(55).label, 'HP');
    expect(ConditionGradeX.fromScore(20).label, 'DMG');
  });
}
