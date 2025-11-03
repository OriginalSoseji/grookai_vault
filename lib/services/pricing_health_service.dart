import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/pricing_health.dart';

class PricingHealthService {
  final SupabaseClient supa;
  const PricingHealthService(this.supa);

  // Simple in-memory session cache (5 minutes)
  static PricingHealth? _cache;
  static DateTime? _cacheAt;
  static const Duration _ttl = Duration(minutes: 5);

  Future<PricingHealth?> fetch() async {
    final now = DateTime.now();
    if (_cache != null && _cacheAt != null && now.difference(_cacheAt!) < _ttl) {
      return _cache;
    }
    final rows = await supa.from('pricing_health_v').select().limit(1) as List<dynamic>;
    if (rows.isEmpty) return null;
    final row = rows.first as Map<String, dynamic>;
    final ph = PricingHealth.fromRow(row);
    _cache = ph; _cacheAt = now;
    return ph;
  }
}
