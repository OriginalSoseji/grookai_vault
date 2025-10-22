// lib/features/search/search_page.dart
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:grookai_vault/services/search_gateway.dart';
import 'package:grookai_vault/services/cards_service.dart';
import 'package:grookai_vault/services/import_queue_service.dart';
import 'package:grookai_vault/services/image_resolver.dart';
import 'package:grookai_vault/services/wishlist_service.dart';

// UI foundation
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/tokens/radius.dart';
import 'package:grookai_vault/ui/widgets/list_cell.dart';
import 'package:grookai_vault/ui/widgets/search_field.dart';
import 'package:grookai_vault/ui/widgets/price_chip.dart';
import 'package:grookai_vault/ui/widgets/async_image.dart';
import 'package:grookai_vault/widgets/fix_card_image.dart';
import 'package:grookai_vault/widgets/smart_card_image.dart';

/// Placeholder tile thumbnail.
Widget _thumbPlaceholder({double size = 56}) {
  return Container(
    width: size,
    height: size,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      borderRadius: GVRadius.br8,
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
    borderRadius: GVRadius.br8,
    child: SmartCardImage.network(
      u,
      width: size,
      height: size,
      fit: BoxFit.cover,
    ),
  );
}

/// Direct network thumbnail that does not attempt tcgdex routing.
Widget _thumbFromUrlDirect(String? url, {double size = 56}) {
  final u = (url ?? '').trim();
  if (u.isEmpty) return _thumbPlaceholder(size: size);
  final fixed = ensureTcgdexImageUrl(u);
  return AsyncImage(
    fixed,
    width: size,
    height: size,
    fit: BoxFit.cover,
    borderRadius: GVRadius.br8,
  );
}

String _normalizeSetCode(String sc, String number, {String? name}) {
  final s = sc.trim().toLowerCase();
  final n = number.trim().toLowerCase();
  if ((s == 'me' || s == 'me01' || s == 'me1') && n.startsWith('rc')) {
    debugPrint('[LAZY] alias-map set_code "$sc" -> "g1" (number="$number")');
    return 'g1';
  }
  return sc;
}

/// Best-effort art from a search row.
Widget _thumbFromRow(Map<String, dynamic> r, {double size = 56}) {
  final rawSet = (r['set_code'] ?? r['setCode'] ?? '').toString().trim();
  final number = (r['number'] ?? '').toString().trim();
  final setCode = _normalizeSetCode(rawSet, number, name: r['name']?.toString());
  final looksAlias = rawSet.toLowerCase().startsWith('me');
  if (!looksAlias && setCode.isNotEmpty && number.isNotEmpty) {
    return ClipRRect(
      borderRadius: GVRadius.br8,
      child: FixCardImage(
        setCode: setCode,
        number: number,
        width: size,
        height: size,
        fit: BoxFit.cover,
        borderRadius: BorderRadius.zero,
      ),
    );
  }
  final best = (r['image_best'] ?? r['image_url'] ?? r['photo_url']) as String?;
  return looksAlias ? _thumbFromUrlDirect(best, size: size) : _thumbFromUrl(best, size: size);
}

Widget _sourceBadge(String? source) {
  final s = (source ?? '').toString().toLowerCase();
  final isDb = s.isEmpty || s == 'db';
  final label = isDb ? 'DB' : s.toUpperCase();
  final bg = isDb ? Colors.green.shade100 : Colors.blue.shade100;
  final fg = isDb ? Colors.green.shade800 : Colors.blue.shade800;
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
    child: Text(label, style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w600)),
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
  final _gateway = SearchGateway();
  final _cards = CardsService();
  final _queue = ImportQueueService();
  final _wishlist = WishlistService();

  List<Map<String, dynamic>> _rows = <Map<String, dynamic>>[];
  final Map<String, String> _queueStatus = <String, String>{};
  bool _loading = false;
  final Set<String> _importing = <String>{};
  final Map<String, DateTime> _cooldownUntil = <String, DateTime>{};

  Timer? _debounce;
  String _lastIssuedQuery = '';
  int _seq = 0;

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  void _onChanged(String q) {
    final query = q.trim();
    debugPrint('[LAZY] query="$query"');
    final useLazy = (dotenv.env['GV_USE_LAZY_SEARCH'] ?? 'true').toLowerCase() == 'true';
    if (!useLazy) {
      if (query == _lastIssuedQuery) return;
      _issueSearch(query);
      return;
    }
    _debounce?.cancel();
    debugPrint('[LAZY] debounce-start 350ms');
    _debounce = Timer(const Duration(milliseconds: 350), () {
      debugPrint('[LAZY] debounce-fire q="$query"');
      if (query == _lastIssuedQuery) {
        debugPrint('[LAZY] distinct-skip q="$query"');
        return;
      }
      _issueSearch(query);
    });
  }

  Future<void> _issueSearch(String q) async {
    final s = q.trim();
    if (s.isEmpty || s.length < 2) {
      if (mounted) setState(() => _rows = []);
      return;
    }
    final mySeq = ++_seq;
    _lastIssuedQuery = s;
    debugPrint('[LAZY] search-run q="$s" seq=$mySeq');
    if (mounted) setState(() => _loading = true);
    try {
      final results = await _gateway.search(s);
      if (mySeq != _seq) return;
      final rows = List<Map<String, dynamic>>.from(results);
      debugPrint('[LAZY] search-done q="$s" count=${rows.length}');
      if (mounted) setState(() => _rows = rows);
    } catch (e, st) {
      debugPrint('[LAZY] search-error q="$s" err=$e');
      if (kDebugMode) debugPrint(st.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  String? _parseTcgDexFromUrl(String? url) {
    final u = (url ?? '').trim();
    if (u.isEmpty) return null;
    final m = RegExp(r'assets\.tcgdex\.net\/[a-z]+\/([a-z0-9]+)\/([a-z0-9\.]+)\/([^\/]+)\/').firstMatch(u);
    if (m != null) {
      final set = m.group(2)!;
      final num = m.group(3)!;
      return '$set|$num';
    }
    return null;
  }

  Future<void> _importRow(Map<String, dynamic> r) async {
    if (_loading) return;
    final rowKey = _rowKey(r);
    if (_importing.contains(rowKey)) return;
    var setCode = _normalizeSetCode((r['set_code'] ?? '').toString(), (r['number'] ?? '').toString(), name: r['name']?.toString());
    var number = (r['number'] ?? '').toString();

    final looksAlias = setCode.toLowerCase().startsWith('me') || setCode.isEmpty || number.isEmpty;
    if (looksAlias) {
      final parsed = _parseTcgDexFromUrl((r['image_url'] ?? r['image_best']) as String?);
      if (parsed != null) {
        final parts = parsed.split('|');
        setCode = parts[0];
        number = parts[1];
      }
    }
    if (setCode.isEmpty || number.isEmpty) {
      final name = (r['name'] ?? '').toString();
      if (name.isNotEmpty) {
        try {
          if (mounted) setState(() => _loading = true);
          if (kDebugMode) debugPrint('[HYDRATE] hydrate start name="$name"');
          final inserted = await _cards.hydrate(name: name);
          if ((inserted['ok'] == false)) {
            final msg = (inserted['message'] ?? 'Import failed').toString();
            _snack('Import failed: $msg');
          } else {
            _snack('Imported + price synced');
          }
          if (mounted) await _issueSearch(_lastIssuedQuery);
        } finally {
          if (mounted) setState(() => _loading = false);
        }
      }
      return;
    }
    try {
      if (mounted) setState(() => _loading = true);
      final out = await _queue.enqueue(setCode: setCode, number: number);
      if (out['ok'] != true) {
        final msg = (out['message'] ?? 'Enqueue failed').toString();
        _snack('Import failed: $msg');
        return;
      }
      final status = (out['status'] ?? 'queued').toString();
      final lang = (out['lang'] ?? 'en').toString();
      final k = '${setCode.toLowerCase()}|${number.toLowerCase()}|$lang';
      setState(() { _queueStatus[k] = status; });
      _snack('Queued import for $setCode#$number');
      _pollImportStatus(setCode, number, lang, rowKey: rowKey);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pollImportStatus(String setCode, String number, String lang, {required String rowKey}) async {
    final key = '${setCode.toLowerCase()}|${number.toLowerCase()}|$lang';
    for (int i = 0; i < 20; i++) {
      await Future.delayed(const Duration(seconds: 2));
      final s = await _queue.getStatus(setCode: setCode, number: number, lang: lang);
      if (s == null) continue;
      if (!mounted) return;
      setState(() { _queueStatus[key] = s; });
      if (s == 'done') {
        _snack('Imported + price synced');
        setState(() { _cooldownUntil[rowKey] = DateTime.now().add(const Duration(seconds: 2)); });
        await _issueSearch(_lastIssuedQuery);
        return;
      }
      if (s == 'error') {
        _snack('Import failed');
        return;
      }
    }
  }

  String _rowKey(Map<String, dynamic> r) {
    final sc = (r['set_code'] ?? '').toString();
    final num = (r['number'] ?? '').toString();
    final name = (r['name'] ?? '').toString();
    if (sc.isNotEmpty && num.isNotEmpty) return '$sc|$num';
    return 'name|$name';
  }

  void _showPriceDetails(Map<String, dynamic> r) {
    final low = (r['price_low'] ?? '').toString();
    final mid = (r['price_mid'] ?? '').toString();
    final high = (r['price_high'] ?? '').toString();
    final currency = (r['currency'] ?? 'USD').toString();
    final updated = (r['price_last_updated'] ?? '').toString();
    showModalBottomSheet(
      context: context,
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.all(GVSpacing.s16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Prices', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: GVSpacing.s12),
              Text('Low:  ${currency == 'USD' ? '\$' : ''}$low'),
              Text('Mid:  ${currency == 'USD' ? '\$' : ''}$mid'),
              Text('High: ${currency == 'USD' ? '\$' : ''}$high'),
              const SizedBox(height: GVSpacing.s8),
              Text('Last updated: ${updated.isEmpty ? '-' : updated}'),
              const SizedBox(height: GVSpacing.s8),
              const Text('Source: Price API'),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('[UI] SearchPage build (rows=${_rows.length}, loading=$_loading)');
    final dbRows = _rows.where((r) => (r['source'] ?? '').toString().toLowerCase() == 'db').toList();
    final extRows = _rows.where((r) => (r['source'] ?? '').toString().toLowerCase() != 'db').toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Search Cards')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(GVSpacing.s16, GVSpacing.s16, GVSpacing.s16, GVSpacing.s8),
            child: SearchField(
              controller: _q,
              onChanged: _onChanged,
              hintText: 'Search name or set code (e.g., Pikachu, OBF, sv6)',
            ),
          ),
          if (_loading) const LinearProgressIndicator(minHeight: 2),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: GVSpacing.s8),
              children: [
                if (dbRows.isNotEmpty) ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: GVSpacing.s16, vertical: GVSpacing.s8),
                    child: Text('In Vault', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  ...dbRows.map(_buildRow),
                ],
                if (extRows.isNotEmpty) ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: GVSpacing.s16, vertical: GVSpacing.s8),
                    child: Text('From TCGdex', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  ...extRows.map(_buildRow),
                ],
                if (dbRows.isEmpty && extRows.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(GVSpacing.s16),
                    child: Center(child: Text('No results')),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRow(Map<String, dynamic> r) {
    final title = (r['name'] ?? 'Card').toString();
    final setCode = (r['set_code'] ?? '').toString();
    final number = (r['number'] ?? '').toString();
    final rarity = (r['rarity'] ?? '').toString();
    final currency = (r['currency'] ?? 'USD').toString();
    final priceLow = (r['price_low'] ?? '').toString();
    final priceMid = (r['price_mid'] ?? '').toString();
    final priceHigh = (r['price_high'] ?? '').toString();
    final priceHas = priceMid.isNotEmpty || priceLow.isNotEmpty || priceHigh.isNotEmpty;
    final sub = [
      if (setCode.isNotEmpty) setCode,
      if (number.isNotEmpty) number,
      if (rarity.isNotEmpty) rarity,
    ].join(' | ');

    final source = (r['source'] ?? '').toString();
    final key = _rowKey(r);
    final inCooldown = (_cooldownUntil[key]?.isAfter(DateTime.now())) ?? false;
    final lang = (r['lang'] ?? 'en').toString();
    final qKey = '${setCode.toLowerCase()}|${number.toLowerCase()}|$lang';
    final qStatus = _queueStatus[qKey] ?? '';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: GVSpacing.s8, vertical: GVSpacing.s4),
      child: ListCell(
        leading: _thumbFromRow(r, size: 44),
        title: Text(title),
        subtitle: Text(sub),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.favorite_border),
              tooltip: 'Toggle wishlist',
              onPressed: () async {
                try {
                  final id = (r['id'] ?? '').toString();
                  if (id.isEmpty) return;
                  final added = await _wishlist.toggle(id);
                  _snack(added ? 'Added to wishlist' : 'Removed from wishlist');
                } catch (_) {
                  _snack('Wishlist action failed');
                }
              },
            ),
            const SizedBox(width: GVSpacing.s8),
            if (priceHas) ...[
              GestureDetector(
                onTap: () => _showPriceDetails(r),
                child: Builder(
                  builder: (context) {
                    final midOrFallback = (priceMid.isNotEmpty
                        ? priceMid
                        : (priceLow.isNotEmpty ? priceLow : priceHigh));
                    if (kDebugMode) {
                      debugPrint('[PRICES] chip.display mid=' + midOrFallback);
                    }
                    return PriceChip(
                      label: (currency == 'USD' ? '\$' : '') + midOrFallback,
                    );
                  },
                ),
              ),
              const SizedBox(width: GVSpacing.s8),
            ],
            if (rarity.isNotEmpty) ...[
              PriceChip(label: rarity, positive: true),
              const SizedBox(width: GVSpacing.s8),
            ],
            _sourceBadge(source),
            if (source.toLowerCase() != 'db') ...[
              const SizedBox(width: GVSpacing.s8),
              if (qStatus == 'queued' || qStatus == 'processing')
                const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              else
                IconButton(
                  icon: const Icon(Icons.add_task),
                  tooltip: 'Add to Catalog',
                  onPressed: (_loading || inCooldown) ? null : () async {
                    setState(() => _importing.add(key));
                    try { await _importRow(r); } finally { if (mounted) setState(() => _importing.remove(key)); }
                  },
                ),
            ],
          ],
        ),
        onTap: () => Navigator.pop(context, r),
      ),
    );
  }
}
 : '') + midOrFallback,
                  );
                }),
              ),
              const SizedBox(width: GVSpacing.s8),
            ],
            if (rarity.isNotEmpty) ...[
              PriceChip(label: rarity, positive: true),
              const SizedBox(width: GVSpacing.s8),
            ],
            _sourceBadge(source),
            if (source.toLowerCase() != 'db') ...[
              const SizedBox(width: GVSpacing.s8),
              if (qStatus == 'queued' || qStatus == 'processing')
                const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              else
                IconButton(
                  icon: const Icon(Icons.add_task),
                  tooltip: 'Add to Catalog',
                  onPressed: (_loading || inCooldown) ? null : () async {
                    setState(() => _importing.add(key));
                    try { await _importRow(r); } finally { if (mounted) setState(() => _importing.remove(key)); }
                  },
                ),
            ],
          ],
        ),
        onTap: () => Navigator.pop(context, r),
      ),
    );
  }
}

