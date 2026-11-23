/// The source observation time, never the time this screen was opened.
String marketPriceUpdatedAt(
  DateTime? observedAt, {
  String label = 'Last updated',
}) {
  if (observedAt == null) return 'Update time unavailable';
  final utc = observedAt.toUtc();
  String two(int value) => value.toString().padLeft(2, '0');
  return '$label ${utc.year}-${two(utc.month)}-${two(utc.day)} '
      '${two(utc.hour)}:${two(utc.minute)} UTC';
}
