// lib/features/pricing/live_pricing.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

String fixMojibake(String s) {
  try {
    return utf8.decode(latin1.encode(s), allowMalformed: true);
  } catch (_) {
    return s;
  }
}

Widget thumb(String? url, {double size = 56}) {
  final u = (url ?? '').trim();
  if (u.isEmpty) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: const Color(0xFFEFEFEF),
      ),
      child: const Icon(Icons.image_not_supported),
    );
  }
  return ClipRRect(
    borderRadius: BorderRadius.circular(8),
    child: Image.network(
      u,
      width: size,
      height: size,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          color: const Color(0xFFEFEFEF),
        ),
        child: const Icon(Icons.broken_image),
      ),
    ),
  );
}

class LivePricingPage extends StatefulWidget {
  const LivePricingPage({super.key});
  @override
  State<LivePricingPage> createState() => _LivePricingPageState();
}

class _LivePricingPageState extends State<LivePricingPage> {
  final supabase = Supabase.instance.client;

  final _searchCtl = TextEditingController();
  DateTime _lastKeystroke = DateTime.now();

  bool _loading = false;
  String _error = '';
  List<Map<String, dynamic>> _rows = <Map<String, dynamic>>[];

  Future<void> _load({String query = ''}) async {
    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final q = query.trim();

      var req = supabase
          .from('v_card_images')
          .select('id, name, set_code, number, image_best');

      if (q.isNotEmpty) {
        req = req.or('name.ilike.%$q%,set_code.ilike.%$q%');
      }

      final data = await req.limit(100);
      setState(() {
        _rows = (data as List).cast<Map<String, dynamic>>();
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onChanged(String s) {
    _lastKeystroke = DateTime.now();
    Future.delayed(const Duration(milliseconds: 350), () {
      final elapsed = DateTime.now().difference(_lastKeystroke).inMilliseconds;
      if (elapsed >= 350) _load(query: _searchCtl.text);
    });
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final body = Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
          child: TextField(
            controller: _searchCtl,
            onChanged: _onChanged,
            decoration: const InputDecoration(
              hintText: 'Filter by name or set code (e.g., Pikachu, OBF, sv6)',
              prefixIcon: Icon(Icons.search),
            ),
          ),
        ),
        if (_loading) const LinearProgressIndicator(minHeight: 2),
        if (_error.isNotEmpty)
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(_error, style: const TextStyle(color: Colors.red)),
          ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => _load(query: _searchCtl.text),
            child: _rows.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 120),
                      Center(child: Text('No results')),
                      SizedBox(height: 120),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(8),
                    itemCount: _rows.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (context, i) {
                      final r = _rows[i];
                      final name = fixMojibake(
                        (r['name'] ?? 'Card').toString(),
                      );
                      final setCode = (r['set_code'] ?? '').toString();
                      final number = (r['number'] ?? '').toString();
                      final img = r['image_best'] as String?;

                      final priceWidget = Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Theme.of(
                            context,
                          ).colorScheme.secondaryContainer.withOpacity(0.6),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'Price: —',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      );

                      return Card(
                        child: ListTile(
                          leading: thumb(img, size: 48),
                          title: Text(
                            name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text('$setCode · $number'),
                          trailing: priceWidget,
                          onTap: () {
                            // Later: navigate to CardPriceChartPage(card: r)
                          },
                        ),
                      );
                    },
                  ),
          ),
        ),
      ],
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pricing (beta)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload',
            onPressed: () => _load(query: _searchCtl.text),
          ),
        ],
      ),
      body: body,
    );
  }
}
