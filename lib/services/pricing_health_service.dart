import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/pricing_health.dart';

class PricingHealthService {
  final SupabaseClient supa;
  const PricingHealthService(this.supa);

  Future<PricingHealth?> fetch() async {
    final rows = await supa.from('pricing_health_v').select().limit(1) as List<dynamic>;
    if (rows.isEmpty) return null;
    final row = rows.first as Map<String, dynamic>;
    return PricingHealth.fromRow(row);
  }
}

