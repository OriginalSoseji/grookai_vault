class PricingHealth {
  final DateTime? mvLatestObservedAt;
  final int mvRows;
  final int jobsFailed24h;
  final int jobsFinished24h;

  const PricingHealth({
    required this.mvLatestObservedAt,
    required this.mvRows,
    required this.jobsFailed24h,
    required this.jobsFinished24h,
  });

  Duration? get age =>
      mvLatestObservedAt == null ? null : DateTime.now().toUtc().difference(mvLatestObservedAt!.toUtc());

  bool get isStale2h {
    final a = age;
    if (a == null) return true;
    return a.inMinutes > 120;
  }

  static PricingHealth fromRow(Map<String, dynamic> row) {
    DateTime? ts;
    final rawTs = row['mv_latest_observed_at'];
    if (rawTs != null) {
      try { ts = DateTime.parse(rawTs.toString()); } catch (_) { ts = null; }
    }
    int toInt(dynamic v) => v is int ? v : int.tryParse('${v ?? 0}') ?? 0;
    return PricingHealth(
      mvLatestObservedAt: ts,
      mvRows: toInt(row['mv_rows']),
      jobsFailed24h: toInt(row['jobs_failed_24h']),
      jobsFinished24h: toInt(row['jobs_finished_24h']),
    );
  }
}

