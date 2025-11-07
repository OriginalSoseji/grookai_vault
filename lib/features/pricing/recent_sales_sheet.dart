import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:grookai_vault/services/supa_client.dart';
import 'package:grookai_vault/services/price_service.dart';

class RecentSalesSheet extends StatefulWidget {
  final String cardId;
  final String condition;
  const RecentSalesSheet({super.key, required this.cardId, required this.condition});

  static Future<void> show(BuildContext context, {required String cardId, required String condition}) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (ctx, controller) => RecentSalesSheet(cardId: cardId, condition: condition),
      ),
    );
  }

  @override
  State<RecentSalesSheet> createState() => _RecentSalesSheetState();
}

class _RecentSalesSheetState extends State<RecentSalesSheet> {
  late final PriceService _prices = PriceService(sb);
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; });
    try {
      final rows = await _prices.soldCompsFromView(widget.cardId, limit: 50);
      if (!mounted) return;
      setState(() { _rows = rows; });
    } finally {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade400, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  const Icon(Icons.history),
                  const SizedBox(width: 8),
                  const Text('Recent Sales'),
                  const Spacer(),
                  IconButton(onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh)),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemBuilder: (context, index) {
                        final s = _rows[index];
                        return _row(context, s);
                      },
                      separatorBuilder: (_, __) => const Divider(height: 12),
                      itemCount: _rows.length,
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(BuildContext context, Map<String, dynamic> s) {
    num? _num(dynamic v) {
      if (v == null) return null; if (v is num) return v; return num.tryParse(v.toString());
    }
    String _pretty(String iso) {
      if (iso.isEmpty) return ''; final dt = DateTime.tryParse(iso); return dt == null ? iso : dt.toLocal().toString().split('.').first;
    }

    final price = _num(s['price']) ?? _num(s['sold_price']) ?? 0;
    final title = (s['title'] ?? '').toString();
    final dateIso = (s['date'] ?? s['sold_at'] ?? '').toString();
    final url = (s['url'] ?? '').toString();
    final effStr = '\$${price.toStringAsFixed(2)}';

    return InkWell(
      onTap: url.isEmpty ? null : () async { try { await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication); } catch (_) {} },
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(title.isEmpty ? '(eBay sale)' : title, maxLines: 2, overflow: TextOverflow.ellipsis),
          ),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(effStr, style: Theme.of(context).textTheme.bodyMedium),
            Text(_pretty(dateIso), style: Theme.of(context).textTheme.labelSmall),
          ]),
        ],
      ),
    );
  }
}


