import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/radius.dart';
import 'package:grookai_vault/ui/widgets/async_image.dart';
import 'package:grookai_vault/services/image_resolver.dart';
import 'package:grookai_vault/features/pricing/card_price_chart_page.dart';

String _fix(String s) {
  try { return utf8.decode(latin1.encode(s)); } catch (_) { return s; }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  HomePageState createState() => HomePageState();
}

class HomePageState extends State<HomePage> {
  final supabase = Supabase.instance.client;
  bool _loading = false;
  String? _uid;
  List<Map<String, dynamic>> _items = const [];

  @override
  void initState() {
    super.initState();
    _uid = supabase.auth.currentUser?.id;
    reload();
  }

  Future<void> reload() async {
    if (_uid == null) {
      setState(() => _items = const []);
      return;
    }
    setState(() => _loading = true);
    try {
      final data = await supabase
          .from('v_vault_items')
          .select('id,card_id,qty,market_price,total,created_at,name,number,set_code,variant,tcgplayer_id,game,image_url,price_source,price_ts')
          .eq('user_id', _uid!)
          .order('created_at', ascending: false);
      setState(() => _items = List<Map<String, dynamic>>.from(data as List));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  num _sumValue(List<Map<String, dynamic>> rows) {
    num total = 0;
    for (final r in rows) {
      final mp = (r['market_price'] ?? 0) as num;
      final q = (r['qty'] ?? 0) as int;
      total += mp * q;
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final unique = _items.length;
    final totalQty = _items.fold<int>(0, (sum, r) => sum + ((r['qty'] ?? 0) as int));
    final recent = List<Map<String, dynamic>>.from(_items.take(5));
    final totalValue = _sumValue(_items);

    return _loading
        ? const Center(child: CircularProgressIndicator())
        : ListView(
            padding: const EdgeInsets.all(GVSpacing.s16),
            children: [
              Wrap(
                spacing: GVSpacing.s12,
                runSpacing: GVSpacing.s12,
                children: [
                  _statCard('Unique cards', '$unique', Icons.style),
                  _statCard('Total quantity', '$totalQty', Icons.numbers),
                  _statCard('Portfolio value', '\$${totalValue.toStringAsFixed(2)}', Icons.attach_money),
                ],
              ),
              const SizedBox(height: GVSpacing.s8),
              Row(
                children: [
                  FilledButton.icon(onPressed: reload, icon: const Icon(Icons.refresh), label: const Text('Refresh')),
                  const SizedBox(width: GVSpacing.s8),
                  OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).pushNamed('/dev-price-import'),
                    icon: const Icon(Icons.developer_mode),
                    label: const Text('Price Import (Dev)'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text('Recently added', style: GVTheme.of(context).typography.title.copyWith(color: GVTheme.of(context).colors.textPrimary)),
              const SizedBox(height: GVSpacing.s8),
              if (recent.isEmpty)
                const Text('No recent items.')
              else
                ...recent.map((row) {
                  final name = (row['name'] ?? 'Item').toString();
                  final setCode = (row['set_name'] ?? '').toString();
                  final number = (row['number'] ?? '').toString();
                  final mp = (row['market_price'] ?? 0) as num;
                  final url = imageUrlFromRow(row);
                  return Card(
                    child: ListTile(
                      leading: AsyncImage(url, width: 44, height: 44),
                      title: Text(_fix(name), style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${setCode.isEmpty ? '' : '$setCode - '}#$number'
                            '${mp > 0 ? ' - \$${mp.toStringAsFixed(2)} ea' : ''}',
                          ),
                          const SizedBox(height: GVSpacing.s8),
                          const SizedBox.shrink(),
                        ],
                      ),
                      trailing: IconButton(
                        tooltip: 'Live',
                        icon: const Icon(Icons.show_chart_rounded),
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CardPriceChartPage(
                              setCode: setCode,
                              number: number,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
            ],
          );
  }

  Widget _statCard(String label, String value, IconData icon) {
    return SizedBox(
      width: 220,
      child: Builder(builder: (context) {
        final gv = GVTheme.of(context);
        return Card(
          color: gv.colors.card,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(GVRadius.r12)),
          child: Padding(
            padding: const EdgeInsets.all(GVSpacing.s12),
            child: Row(children: [
              Icon(icon, size: 28, color: gv.colors.accent),
              const SizedBox(width: GVSpacing.s12),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label, style: gv.typography.caption.copyWith(color: gv.colors.textSecondary)),
                Text(value, style: gv.typography.title.copyWith(fontWeight: FontWeight.w700, color: gv.colors.textPrimary)),
              ]),
            ]),
          ),
        );
      }),
    );
  }
}

