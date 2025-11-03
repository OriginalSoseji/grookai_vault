import 'package:flutter/material.dart';
import 'package:grookai_vault/services/supa_client.dart';
import 'package:grookai_vault/features/dev/diagnostics/pricing_health_chip.dart';
import 'package:grookai_vault/viewmodels/card_detail_vm.dart';
import 'package:grookai_vault/widgets/condition_chips.dart';
import 'package:grookai_vault/widgets/price_card.dart';

const bool kEbaySoldDebug = true; // set false for normal runs

class PricingSmokePage extends StatefulWidget {
  const PricingSmokePage({super.key});
  @override
  State<PricingSmokePage> createState() => _PricingSmokePageState();
}

class _PricingSmokePageState extends State<PricingSmokePage> {
  late CardDetailVM vm;
  final String cardId = '00000000-0000-0000-0000-000000000000'; // replace with a real id during local testing

  @override
  void initState() {
    super.initState();
    vm = CardDetailVM(supabase: sb, cardId: cardId, initialCondition: 'NM', debugSold: kEbaySoldDebug);
    vm.addListener(() { if (mounted) setState(() {}); });
    WidgetsBinding.instance.addPostFrameCallback((_) { vm.load(); });
  }

  @override
  void dispose() { vm.dispose(); super.dispose(); }

  // Escalation banner (diagnostics only) if staleness > 6h
  Widget _EscalationBanner() {
    return FutureBuilder(
      future: sb.from('pricing_health_v').select().limit(1) as Future<dynamic>,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done || snap.hasError) return const SizedBox.shrink();
        final list = (snap.data as List?) ?? const [];
        if (list.isEmpty) return const SizedBox.shrink();
        final row = list.first as Map<String, dynamic>;
        final raw = row['mv_latest_observed_at']?.toString();
        DateTime? ts; try { ts = raw != null ? DateTime.parse(raw) : null; } catch (_) {}
        if (ts == null) return const SizedBox.shrink();
        final age = DateTime.now().toUtc().difference(ts.toUtc());
        if (age.inHours <= 6) return const SizedBox.shrink();
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.amber.withOpacity(0.15),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.amber.withOpacity(0.35)),
          ),
          child: Text('Heads up: price data is ${age.inHours}h old. Scheduled refresh runs every ~15 min.',
              style: Theme.of(context).textTheme.bodySmall),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pricing Smoke')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PricesAsOfChip(supabase: sb),
            _EscalationBanner(),
            const SizedBox(height: 8),
            ConditionChips(value: vm.condition, onChanged: (c) => vm.setCondition(c)),
            const SizedBox(height: 12),
            if (vm.isLoading) const Center(child: CircularProgressIndicator())
            else if (vm.error != null) Text(vm.error!, style: TextStyle(color: Theme.of(context).colorScheme.error))
            else PriceCard(gi: vm.giMid, ts: vm.observedAt, retailFloor: vm.retailFloor, marketFloor: vm.marketFloor, gv: vm.gvBaseline),
          ],
        ),
      ),
    );
  }
}
