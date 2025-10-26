import 'package:flutter/material.dart';
import 'package:grookai_vault/viewmodels/card_detail_vm.dart';
import 'package:grookai_vault/services/supa_client.dart';

class PricingDiagnosticsPage extends StatefulWidget {
  final String cardId;
  final String condition;
  const PricingDiagnosticsPage({super.key, required this.cardId, this.condition = 'NM'});

  @override
  State<PricingDiagnosticsPage> createState() => _PricingDiagnosticsPageState();
}

class _PricingDiagnosticsPageState extends State<PricingDiagnosticsPage> {
  late CardDetailVM vm;
  @override
  void initState() {
    super.initState();
    vm = CardDetailVM(cardId: widget.cardId, supabase: sb, initialCondition: widget.condition)
      ..addListener(() => mounted ? setState(() {}) : null)
      ..load();
  }
  @override
  void dispose() { vm.dispose(); super.dispose(); }

  Widget _row(String k, dynamic v) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: SelectableText('$k: $v', style: const TextStyle(fontFamily: 'monospace')),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pricing Diagnostics')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Card: ${widget.cardId} • ${vm.condition}'),
          const SizedBox(height: 12),
          _row('giLow', vm.giLow), _row('giMid', vm.giMid), _row('giHigh', vm.giHigh),
          _row('observedAt', vm.observedAt),
          _row('retailFloor', vm.retailFloor), _row('marketFloor', vm.marketFloor), _row('gvBaseline', vm.gvBaseline),
          _row('age(min)', vm.age?.inMinutes),
          _row('pct7d', vm.pct7d),
          const SizedBox(height: 12),
          const Text('Trend (oldest→newest):'),
          SelectableText(vm.trend.join(', '), style: const TextStyle(fontFamily: 'monospace')),
          const SizedBox(height: 12),
          const Text('Last 5 Sold (eBay):'),
          SelectableText((vm.sold5).toString(), style: const TextStyle(fontFamily: 'monospace')),
        ],
      ),
    );
  }
}

