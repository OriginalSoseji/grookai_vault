import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

enum PriceRange { d7, m1, m3, y1, all }

class PriceChart extends StatefulWidget {
  final List<FlSpot> data;
  final PriceRange range;
  const PriceChart({super.key, required this.data, required this.range});
  @override
  State<PriceChart> createState() => _PriceChartState();
}

class _PriceChartState extends State<PriceChart> {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPressStart: (_) {},
      onLongPressEnd: (_) {},
      child: LineChart(
        LineChartData(
          lineTouchData: const LineTouchData(handleBuiltInTouches: true),
          titlesData: FlTitlesData(show: false),
          gridData: FlGridData(show: false),
          borderData: FlBorderData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: widget.data,
              isCurved: true,
              color: Colors.greenAccent,
              barWidth: 2,
              dotData: FlDotData(show: false),
            ),
          ],
        ),
        duration: const Duration(milliseconds: 200),
      ),
    );
  }
}
