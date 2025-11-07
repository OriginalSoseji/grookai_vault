import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/app/route_names.dart';
import 'package:grookai_vault/shared/text/sanitize.dart';
import 'package:grookai_vault/ui/widgets/card_thumb.dart';
import 'package:grookai_vault/core/util/debouncer.dart';
import 'package:grookai_vault/core/net/supa_timeout.dart';

final supabase = Supabase.instance.client;

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});
  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final _q = TextEditingController();
  final Debouncer _debounce = Debouncer(ms: 350);
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = false;
  final int _limit = 50;
  int _offset = 0;
  bool _hasMore = true;

  @override
  void dispose() {
    _debounce.dispose();
    _q.dispose();
    super.dispose();
  }

  void _onChanged(String s) {
    _debounce.run(() => _search(s));
  }

  Future<List<Map<String, dynamic>>> _runSearch(String q, {int limit = 50, int offset = 0}) async {
    if (q.trim().isEmpty) return <Map<String, dynamic>>[];
    try {
      final rpc = await supabase
          .rpc('search_cards', params: {
        'q': q,
        'limit': limit,
        'offset': offset,
      })
          .withReadTimeout();
      final base = (rpc as List).cast<Map<String, dynamic>>();

      final ids = base.map((r) => (r['id'] ?? '').toString()).where((s) => s.isNotEmpty).toList();
      Map<String, Map<String, dynamic>> enrich = {};
      if (ids.isNotEmpty) {
        final enrichRows = await supabase
            .from('v_card_search')
            .select('id,image_best,image_url,thumb_url,latest_price_cents,latest_price')
            .inFilter('id', ids)
            .withReadTimeout() as List<dynamic>;
        for (final e in enrichRows) {
          final m = Map<String, dynamic>.from(e as Map);
          enrich[(m['id'] ?? '').toString()] = m;
        }
      }

      final merged = base.map((r) {
        final id = (r['id'] ?? '').toString();
        final img = enrich[id];
        return {
          'id': id,
          'name': r['name'],
          'set_code': r['set_code'],
          'number_raw': r['number'],
          'image_best': img?['image_best'] ?? img?['image_url'] ?? img?['thumb_url'],
          'image_url': img?['image_url'],
          'thumb_url': img?['thumb_url'],
          'latest_price_cents': img?['latest_price_cents'],
          'latest_price': img?['latest_price'],
          'score': r['score'],
        };
      }).toList();
      debugPrint('[SEARCH_RPC] q="$q" limit=$limit offset=$offset -> ${merged.length} results');
      return merged;
    } catch (e, st) {
      debugPrint('[SEARCH_ERROR] $e\n$st');
      try {
        final res = await supabase
            .from('v_card_search')
            .select('id,name,set_code,number_raw,image_best,image_url,thumb_url,latest_price_cents,latest_price')
            .ilike('name', '%$q%')
            .order('name')
            .range(offset, offset + limit - 1)
            .withReadTimeout() as List<dynamic>;
        return res.map((m) => Map<String, dynamic>.from(m as Map)).toList();
      } catch (_) {
        return <Map<String, dynamic>>[];
      }
    }
  }

  Future<void> _search(String raw) async {
    final query = raw.trim();
    if (query.isEmpty) {
      setState(() { _rows = const []; _hasMore = true; _offset = 0; });
      return;
    }
    setState(() => _loading = true);
    try {
      final rows = await _runSearch(query, limit: _limit, offset: 0);
      setState(() {
        _rows = rows;
        _offset = rows.length;
        _hasMore = rows.length == _limit;
      });
    } catch (e) {
      debugPrint('[SEARCH] error $e');
      setState(() => _rows = const []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchMore() async {
    final q = _q.text.trim();
    if (!_hasMore || q.isEmpty) return;
    final more = await _runSearch(q, limit: _limit, offset: _offset);
    setState(() {
      _rows = List.of(_rows)..addAll(more);
      _offset += more.length;
      _hasMore = more.length == _limit;
    });
  }

  

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Card Search')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _q,
              textInputAction: TextInputAction.search,
              onChanged: _onChanged,
              onSubmitted: _search,
              decoration: const InputDecoration(
                hintText: 'Search by name or number...',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
            ),
          ),
          if (_loading) const LinearProgressIndicator(),
          if (!_loading && _q.text.trim().isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '${_rows.length} result${_rows.length == 1 ? '' : 's'}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
          Expanded(
            child: _rows.isEmpty
                ? const Center(child: Text('No results. Try a name or set + number (e.g., 049/203).'))
                : ListView.separated(
                    itemCount: _rows.length + (_hasMore ? 1 : 0),
                    separatorBuilder: (context, index) => const Divider(height: 1),
                    itemBuilder: (context, i) {
                      if (i >= _rows.length) {
                        return Padding(
                          padding: const EdgeInsets.all(12),
                          child: Center(
                            child: OutlinedButton(
                              onPressed: _fetchMore,
                              child: const Text('Load more'),
                            ),
                          ),
                        );
                      }

                      final r = _rows[i];
                      final name = sanitizeUiText((r['name'] ?? 'Card').toString());
                      final set = (r['set_code'] ?? '').toString().toUpperCase();
                      final num = (r['number_raw'] ?? '').toString();
                      final cents = r['latest_price_cents'] as int?;
                      final img = (r['thumb_url'] ?? r['image_best'] ?? r['image_url'] ?? '').toString();

                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        leading: SizedBox(
                          width: 56,
                          height: 74,
                          child: CardThumb(url: img, logicalWidth: 56, logicalHeight: 74),
                        ),
                        title: Row(
                          children: [
                            Expanded(
                              child: Text(
                                name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        subtitle: Text(
                          '${set.isNotEmpty ? set : ''}  •  #$num',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 96),
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerRight,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                if (cents != null) Text('4${(cents / 100.0).toStringAsFixed(2)}'),
                              ],
                            ),
                          ),
                        ),
                        onTap: () => Navigator.of(context).pushNamed(
                          RouteNames.cardDetail,
                          arguments: {'cardId': (r['id'] ?? '').toString()},
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
