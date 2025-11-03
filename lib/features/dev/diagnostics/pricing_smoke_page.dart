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
