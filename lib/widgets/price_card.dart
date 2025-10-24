import 'package:flutter/material.dart';

class PriceCard extends StatelessWidget {
  final num? gi;
  final DateTime? ts;
  final num? retailFloor;
  final num? marketFloor;
  final num? gv;
  const PriceCard({super.key, required this.gi, required this.ts, required this.retailFloor, required this.marketFloor, this.gv});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  gi != null ? '\$${gi!.toStringAsFixed(2)}' : '-',
                  style: text.headlineSmall,
                ),
                const SizedBox(width: 8),
                const _Badges(),
                const Spacer(),
                if (ts != null)
                  Text('${ts!.toLocal()}'.split('.').first, style: text.labelSmall),
              ],
            ),
            const SizedBox(height: 8),
            _row('Retail Floor (JTCG)', retailFloor, context),
            _row('Market Floor (eBay BIN)', marketFloor, context),
            if (gv != null) _row('GV Baseline', gv, context),
            const SizedBox(height: 8),
            const _BlendInfo(),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, num? v, BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
          Text(v != null ? '\$${v.toStringAsFixed(2)}' : '-')
        ],
      ),
    );
  }
}

class _Badges extends StatelessWidget {
  const _Badges();
  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.labelSmall;
    return Row(children: [
      _pill('JTCG', style), const SizedBox(width: 4), _pill('eBay', style), const SizedBox(width: 4), _pill('GV', style),
    ]);
  }
  Widget _pill(String t, TextStyle? s) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(8)),
    child: Text(t, style: s),
  );
}

class _BlendInfo extends StatelessWidget {
  const _BlendInfo();
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      const Text('ℹ️', style: TextStyle(fontSize: 12)),
      const SizedBox(width: 6),
      Expanded(child: Text('Grookai Index: JTCG 45% • eBay Sold 35% • GV 20% (renormalized if missing).', style: Theme.of(context).textTheme.labelSmall)),
    ]);
  }
}

