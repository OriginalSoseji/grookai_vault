import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/features/search/query_normalizer.dart';

void main() {
  test('normalizes common number formats', () {
    final a = QueryNormalizer.normalize('049/203');
    expect(a.numberFraction, '049/203');
    final b = QueryNormalizer.normalize('49');
    expect(b.numberPadded, '049');
    final c = QueryNormalizer.normalize('#049');
    expect(c.numberPadded, '049');
    final d = QueryNormalizer.normalize('Pikachu 049');
    expect(d.numberPadded, '049');
  });
}

