// lib/features/search/search_page.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Small thumbnail with graceful fallbacks.
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
          .from('v_card_search') // uses image_best from your SQL view
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
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (context, i) {
                      final r = _rows[i];
                      final title = (r['name'] ?? 'Card').toString();
                      final sub =
                          '${(r['set_code'] ?? '').toString()} · ${(r['number'] ?? '').toString()}'
                          '${(r['rarity'] != null && (r['rarity'] as String).isNotEmpty) ? ' · ${r['rarity']}' : ''}';
                      final img = r['image_best'] as String?;

                      return Card(
                        child: ListTile(
                          leading: thumb(img, size: 44),
                          title: Text(
                            title,
                            style:
                                const TextStyle(fontWeight: FontWeight.bold),
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
