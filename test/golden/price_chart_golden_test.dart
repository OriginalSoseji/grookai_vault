import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/features/detail/widgets/price_chart.dart' as pc;

void main() {
  testWidgets('price chart renders without exceptions', (tester) async {
    final spots = [
      const FlSpot(0, 1),
      const FlSpot(1, 1.2),
      const FlSpot(2, 0.9),
      const FlSpot(3, 1.4),
    ];
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: pc.PriceChart(data: spots, range: pc.PriceRange.d7))));
    await tester.pumpAndSettle();
  });
}

