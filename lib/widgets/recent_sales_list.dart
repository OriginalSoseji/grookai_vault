import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class RecentSalesList extends StatelessWidget {
  final List<Map<String, dynamic>> sales; // normalized
  const RecentSalesList({super.key, required this.sales});

  @override
  Widget build(BuildContext context) {
    final safe = sales
        .where((s) => ((s as Map)['price'] != null || (s as Map)['title'] != null))
        .cast<Map<String, dynamic>>()
        .toList();
    if (safe.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: Text('No recent eBay sales for this condition.'),
      );
    }
    return Column(children: [ for (final s in safe.take(5)) _row(context, s) ]);
  }

  Widget _row(BuildContext context, Map<String, dynamic> s) {
    final price = _num(s['price']) ?? 0;
    final shipping = _num(s['shipping']) ?? 0;
    final title = (s['title'] ?? '').toString();
    final dateIso = (s['date'] ?? '').toString();
    final url = (s['url'] ?? '').toString();

    final eff = price + (shipping > 0 ? shipping : 0);
    final effStr = '\$${eff.toStringAsFixed(2)}'
        '${shipping > 0 ? ' (+\$${shipping.toStringAsFixed(2)} ship)' : ''}';

    return InkWell(
      onTap: url.isEmpty ? null : () async { try { await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication); } catch (_) {} },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                title.isEmpty ? '(eBay sale)' : title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(effStr, style: Theme.of(context).textTheme.bodyMedium),
                Text(_pretty(dateIso), style: Theme.of(context).textTheme.labelSmall),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static num? _num(dynamic v) {
    if (v == null) return null;
    if (v is num) return v;
    return num.tryParse(v.toString());
  }

  static String _pretty(String iso) {
    if (iso.isEmpty) return '';
    final dt = DateTime.tryParse(iso);
    return dt == null ? iso : dt.toLocal().toString().split('.').first;
  }
}



