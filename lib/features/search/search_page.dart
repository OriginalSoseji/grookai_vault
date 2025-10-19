// lib/features/search/search_page.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:grookai_vault/widgets/fix_card_image.dart';
import 'package:grookai_vault/widgets/smart_card_image.dart';

/// Placeholder tile thumbnail.
Widget _thumbPlaceholder({double size = 56}) {
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

/// Smart URL-based thumbnail with caching & tcgdex auto-routing.
Widget _thumbFromUrl(String? url, {double size = 56}) {
  final u = (url ?? '').trim();
  if (u.isEmpty) return _thumbPlaceholder(size: size);
  return ClipRRect(
    borderRadius: BorderRadius.circular(8),
    child: SmartCardImage.network(
      u,
      width: size,
      height: size,
      fit: BoxFit.cover,
    ),
  );
}

/// Best-effort card art for a search row:
/// - If we have set_code+number, use FixCardImage (multi-source fallback, cached)
/// - Else, fall back to image_best URL via SmartCardImage
Widget _thumbFromRow(Map<String, dynamic> r, {double size = 56}) {
  final setCode = (r['set_code'] ?? r['setCode'] ?? '').toString().trim();
  final number = (r['number'] ?? '').toString().trim();
  if (setCode.isNotEmpty && number.isNotEmpty) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: FixCardImage(
        setCode: setCode,
        number: number,
        width: size,
        height: size,
        fit: BoxFit.cover,
        borderRadius: BorderRadius.zero, // already clipped above
      ),
    );
  }
  return _thumbFromUrl(r['image_best'] as String?, size: size);
}

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final supabase = Supabase.instance.client;
  final _q = TextEditingController();

  List<Map<String, dynamic>> _rows = <Map<String, dynamic>>[];
  bool _loading = false;
  DateTime _lastType = DateTime.now();

  Future<void> _fetch(String query) async {
    final s = query.trim();
    if (s.length < 2) {
      setState(() => _rows = []);
      return;
    }
    setState(() => _loading = true);
    try {
      final data = await supabase
          .from('v_card_search') // SQL view should expose: id, set_code, number, name, rarity, image_best
          .select('id, set_code, number, name, rarity, image_best')
          .or('name.ilike.%$s%,set_code.ilike.%$s%')
          .limit(50);

      setState(() => _rows = List<Map<String, dynamic>>.from(data as List));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onChanged(String s) {
    _lastType = DateTime.now();
    Future.delayed(const Duration(milliseconds: 350), () {
      final elapsed = DateTime.now().difference(_lastType).inMilliseconds;
      if (elapsed >= 350) _fetch(s);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Search Cards')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
            child: TextField(
              controller: _q,
              decoration: const InputDecoration(
                hintText: 'Search name or set code (e.g., Pikachu, OBF, sv6)',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: _onChanged,
            ),
          ),
          if (_loading) const LinearProgressIndicator(minHeight: 2),
          Expanded(
            child: _rows.isEmpty
                ? const Center(child: Text('No results'))
                : ListView.separated(
                    padding: const EdgeInsets.all(8),
                    itemCount: _rows.length,
                    separatorBuilder: (context, _) => const SizedBox(height: 6),
                    itemBuilder: (context, i) {
                      final r = _rows[i];
                      final title = (r['name'] ?? 'Card').toString();
                      final setCode = (r['set_code'] ?? '').toString();
                      final number = (r['number'] ?? '').toString();
                      final rarity = (r['rarity'] ?? '').toString();
                      final sub = [
                        if (setCode.isNotEmpty) setCode,
                        if (number.isNotEmpty) number,
                        if (rarity.isNotEmpty) rarity,
                      ].join(' | ');

                      return Card(
                        child: ListTile(
                          leading: _thumbFromRow(r, size: 44),
                          title: Text(
                            title,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(sub),
                          onTap: () {
                            Navigator.pop(context, r);
                          },
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
