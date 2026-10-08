import 'package:flutter/material.dart';
import '../../services/vault/portfolio_history_timeline.dart';

class PortfolioTimeline extends StatefulWidget {
  const PortfolioTimeline({super.key, required this.points});
  final List<Map<String, dynamic>> points;
  @override
  State<PortfolioTimeline> createState() => _PortfolioTimelineState();
}

class _PortfolioTimelineState extends State<PortfolioTimeline> {
  String? _selected;
  @override
  Widget build(BuildContext context) {
    final currencies =
        widget.points
            .expand((p) => (p['totals'] as Map).keys.cast<String>())
            .toSet()
            .toList()
          ..sort();
    if (widget.points.length < 2 || currencies.isEmpty) {
      return const SizedBox.shrink();
    }
    final currency = currencies.contains(_selected)
            ? _selected!
            : currencies.first,
        data = portfolioTimeline(widget.points, currency),
        priced = data.where((p) => p['y'] != null).toList()
          ..sort((a, b) => (a['y'] as int).compareTo(b['y'] as int));
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Recorded reference value',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          DropdownButton<String>(
            value: currency,
            isExpanded: true,
            items: currencies
                .map((v) => DropdownMenuItem(value: v, child: Text(v)))
                .toList(),
            onChanged: (v) => setState(() => _selected = v),
          ),
          Text(
            'Observed range: $currency ${priced.last['label']} – ${priced.first['label']}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          Semantics(
            label:
                '$currency, ${priced.length} priced observations. Exact values and coverage are listed below.',
            image: true,
            child: SizedBox(
              height: 160,
              width: double.infinity,
              child: CustomPaint(
                painter: _TimelinePainter(
                  data,
                  Theme.of(context).colorScheme.primary,
                  Theme.of(context).colorScheme.outline,
                ),
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                (data.first['capturedAt'] as String).substring(0, 10),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              Text(
                (data.last['capturedAt'] as String).substring(0, 10),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Dots are saved observations, spaced by capture time. No visit, no point. × means no price coverage. Copy coverage is listed below.',
          ),
        ],
      ),
    );
  }
}

class _TimelinePainter extends CustomPainter {
  _TimelinePainter(this.points, this.dot, this.axis);
  final List<Map<String, dynamic>> points;
  final Color dot, axis;
  @override
  void paint(Canvas canvas, Size size) {
    const inset = 8.0;
    final width = size.width - inset * 2, height = size.height - 32;
    final line = Paint()
      ..color = axis
      ..strokeWidth = 1;
    canvas.drawLine(const Offset(inset, 8), Offset(inset, height), line);
    canvas.drawLine(
      Offset(inset, height),
      Offset(size.width - inset, height),
      line,
    );
    for (final point in points) {
      final x = inset + (point['x'] as int) * width / 1000;
      if (point['y'] == null) {
        canvas.drawLine(
          Offset(x - 3, height + 12),
          Offset(x + 3, height + 18),
          line,
        );
        canvas.drawLine(
          Offset(x - 3, height + 18),
          Offset(x + 3, height + 12),
          line,
        );
      } else {
        canvas.drawCircle(
          Offset(x, 8 + (point['y'] as int) * (height - 16) / 1000),
          4,
          Paint()..color = dot,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _TimelinePainter oldDelegate) =>
      oldDelegate.points != points ||
      oldDelegate.dot != dot ||
      oldDelegate.axis != axis;
}
