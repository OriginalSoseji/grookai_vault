import 'portfolio_history.dart';

/// Plot geometry only. No new price, interpolation or portfolio valuation.
List<Map<String, dynamic>> portfolioTimeline(
  List<Map<String, dynamic>> points,
  String currency,
) {
  if (points.length > 20000 || !RegExp(r'^[A-Z]{3}$').hasMatch(currency)) {
    throw const FormatException('Invalid history timeline.');
  }
  final sorted = points.map(validatePortfolioSummary).toList()
    ..sort(
      (a, b) => BigInt.parse(
        a['sequence'] as String,
      ).compareTo(BigInt.parse(b['sequence'] as String)),
    );
  final ids = <String>{};
  Map<String, dynamic>? previous;
  for (final point in sorted) {
    if (!ids.add(point['snapshotId'] as String) ||
        (previous != null &&
            (BigInt.parse(previous['sequence'] as String) >=
                    BigInt.parse(point['sequence'] as String) ||
                (previous['capturedAt'] as String).compareTo(
                      point['capturedAt'] as String,
                    ) >
                    0))) {
      throw const FormatException('Invalid history ordering.');
    }
    previous = point;
  }
  final values = sorted
      .map((p) => p['totals'][currency]?['exact'] as String?)
      .toList();
  var scale = 0;
  for (final value in values.whereType<String>()) {
    final parts = value.split('.');
    final digits = parts.length == 1 ? 0 : parts[1].length;
    if (digits > scale) scale = digits;
  }
  BigInt integer(String v) {
    final parts = v.split('.');
    return BigInt.parse(
      parts.first + (parts.length == 1 ? '' : parts[1]).padRight(scale, '0'),
    );
  }

  BigInt? min, max;
  for (final value in values.whereType<String>()) {
    final v = integer(value);
    if (min == null || v < min) min = v;
    if (max == null || v > max) max = v;
  }
  final start = sorted.isEmpty
          ? 0
          : DateTime.parse(
              sorted.first['capturedAt'] as String,
            ).millisecondsSinceEpoch,
      end = sorted.isEmpty
          ? 0
          : DateTime.parse(
              sorted.last['capturedAt'] as String,
            ).millisecondsSinceEpoch;
  return [
    for (var i = 0; i < sorted.length; i++)
      {
        'snapshotId': sorted[i]['snapshotId'],
        'capturedAt': sorted[i]['capturedAt'],
        'x': end == start
            ? 500
            : ((DateTime.parse(
                            sorted[i]['capturedAt'] as String,
                          ).millisecondsSinceEpoch -
                          start) /
                      (end - start) *
                      1000)
                  .round(),
        'y': values[i] == null
            ? null
            : min == max
            ? 500
            : ((max! - integer(values[i]!)) * BigInt.from(1000) ~/ (max - min!))
                  .toInt(),
        'label': sorted[i]['totals'][currency]?['display'],
        'priced': sorted[i]['coverage']['byCurrency'][currency] ?? 0,
        'owned': sorted[i]['coverage']['owned'],
      },
  ];
}
