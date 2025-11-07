// Codex: created 2025-11-03
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/pricing_alert.dart';

class PricingAlertsService {
  final SupabaseClient _db;
  PricingAlertsService(this._db);

  Future<List<PricingAlert>> list() async {
    final rows = await _db
        .from('pricing_alerts_v')
        .select('mv_latest_observed_at,jobs_failed_24h,is_stale_60m')
        .limit(1) as List<dynamic>;

    final List<PricingAlert> alerts = [];
    if (rows.isEmpty) return alerts;
    final r = rows.first as Map<String, dynamic>;
    final rawTs = r['mv_latest_observed_at']?.toString();
    DateTime ts; try { ts = DateTime.parse(rawTs ?? ''); } catch (_) { ts = DateTime.now().toUtc(); }
    final failed = (r['jobs_failed_24h'] is int) ? r['jobs_failed_24h'] as int : int.tryParse('${r['jobs_failed_24h'] ?? 0}') ?? 0;
    final stale = r['is_stale_60m'] == true || r['is_stale_60m']?.toString() == 'true';
    if (stale) {
      alerts.add(PricingAlert(code: 'STALE_MV', message: 'Latest prices older than 60 minutes', observedAt: ts));
    }
    if (failed > 0) {
      alerts.add(PricingAlert(code: 'FAILED_JOBS', message: '$failed job(s) failed in last 24h', observedAt: ts));
    }
    return alerts;
  }
}

