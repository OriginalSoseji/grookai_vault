import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show ScrollCacheExtent;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/sealed/mtg_sealed_client_v1.dart';

class MtgSealedCatalogScreen extends StatefulWidget {
  const MtgSealedCatalogScreen({super.key, this.client, this.gameKey = 'mtg'});

  final MtgSealedClientV1? client;
  final String gameKey;

  @override
  State<MtgSealedCatalogScreen> createState() => _MtgSealedCatalogScreenState();
}

class _MtgSealedCatalogScreenState extends State<MtgSealedCatalogScreen> {
  final TextEditingController _searchController = TextEditingController();
  String? _packageForm;
  String? _languageCode;
  int _offset = 0;
  int _request = 0;
  String get _gameLabel => widget.gameKey == 'pokemon' ? 'Pokemon' : 'MTG';
  MtgSealedClientV1 get _client =>
      widget.client ??
      MtgSealedClientV1(
        transport: SupabaseMtgSealedClientTransportV1(
          client: Supabase.instance.client,
          gameKey: widget.gameKey,
          packageForm: _packageForm,
          languageCode: _languageCode,
        ),
        gameKey: widget.gameKey,
        enabled: widget.gameKey == 'pokemon'
            ? kPokemonSealedClientV1Enabled
            : kMtgSealedClientV1Enabled,
      );

  MtgSealedCatalogStateV1 _state = MtgSealedCatalogStateV1.loading;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final request = ++_request;
    setState(() => _state = MtgSealedCatalogStateV1.loading);
    final next = await _client.load(
      query: _searchController.text.trim(),
      limit: 24,
      offset: _offset,
    );
    if (mounted && request == _request) setState(() => _state = next);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          '$_gameLabel Sealed',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _state.status == MtgSealedCatalogStatusV1.loading
                ? null
                : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
              child: TextField(
                key: const Key('mtg-sealed-search'),
                controller: _searchController,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) {
                  _offset = 0;
                  _load();
                },
                decoration: InputDecoration(
                  hintText: 'Search boxes, bundles, or decks',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: IconButton(
                    tooltip: 'Search',
                    onPressed: () {
                      _offset = 0;
                      _load();
                    },
                    icon: const Icon(Icons.arrow_forward),
                  ),
                ),
              ),
            ),
            if (widget.gameKey == 'pokemon')
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: DropdownButton<String>(
                        value: _packageForm ?? '',
                        isExpanded: true,
                        items:
                            const {
                                  '': 'All packages',
                                  'booster_box': 'Booster boxes',
                                  'display': 'Booster displays',
                                  'pack': 'Booster packs',
                                  'sleeved_pack': 'Sleeved packs',
                                  'kit': 'Kits / ETBs',
                                  'tin': 'Tins',
                                  'collection': 'Collections',
                                  'bundle': 'Bundles',
                                  'deck': 'Decks',
                                  'deck_display': 'Deck displays',
                                  'promo_pack': 'Promo packs',
                                  'case': 'Cases',
                                }.entries
                                .map(
                                  (e) => DropdownMenuItem(
                                    value: e.key,
                                    child: Text(e.value),
                                  ),
                                )
                                .toList(),
                        onChanged: (v) {
                          setState(() {
                            _packageForm = v == '' ? null : v;
                            _offset = 0;
                          });
                          _load();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButton<String>(
                        value: _languageCode ?? '',
                        isExpanded: true,
                        items:
                            const {
                                  '': 'All languages',
                                  'en': 'English',
                                  'ja': 'Japanese',
                                  'zh': 'Chinese',
                                  'ko': 'Korean',
                                  'fr': 'French',
                                  'de': 'German',
                                  'it': 'Italian',
                                  'pt': 'Portuguese',
                                  'es': 'Spanish',
                                  'ru': 'Russian',
                                }.entries
                                .map(
                                  (e) => DropdownMenuItem(
                                    value: e.key,
                                    child: Text(e.value),
                                  ),
                                )
                                .toList(),
                        onChanged: (v) {
                          setState(() {
                            _languageCode = v == '' ? null : v;
                            _offset = 0;
                          });
                          _load();
                        },
                      ),
                    ),
                  ],
                ),
              ),
            Expanded(child: _buildContent(context)),
            if (_state.status == MtgSealedCatalogStatusV1.ready || _offset > 0)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    tooltip: 'Previous page',
                    icon: const Icon(Icons.chevron_left),
                    onPressed:
                        _offset == 0 ||
                            _state.status == MtgSealedCatalogStatusV1.loading
                        ? null
                        : () {
                            _offset = (_offset - 24).clamp(0, 100000);
                            _load();
                          },
                  ),
                  Text('Page ${_offset ~/ 24 + 1}'),
                  IconButton(
                    tooltip: 'Next page',
                    icon: const Icon(Icons.chevron_right),
                    onPressed:
                        _state.status != MtgSealedCatalogStatusV1.ready ||
                            _state.rows.length < 24
                        ? null
                        : () {
                            _offset += 24;
                            _load();
                          },
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    switch (_state.status) {
      case MtgSealedCatalogStatusV1.loading:
        return const Center(child: CircularProgressIndicator());
      case MtgSealedCatalogStatusV1.ready:
        return _MtgSealedGrid(rows: _state.rows);
      case MtgSealedCatalogStatusV1.empty:
        return _MtgSealedMessage(
          title: 'No sealed products found',
          actionLabel: 'Clear search',
          onAction: () {
            _searchController.clear();
            _offset = 0;
            _load();
          },
        );
      case MtgSealedCatalogStatusV1.signedOut:
        return _MtgSealedMessage(
          title: 'Sign in to browse $_gameLabel sealed products',
        );
      case MtgSealedCatalogStatusV1.stale:
        return _MtgSealedMessage(
          title: 'Sealed pricing is being refreshed',
          actionLabel: 'Retry',
          onAction: _load,
        );
      case MtgSealedCatalogStatusV1.missingImage:
        return _MtgSealedMessage(
          title: 'Verified sealed images are being prepared',
          actionLabel: 'Retry',
          onAction: _load,
        );
      case MtgSealedCatalogStatusV1.offline:
        return _MtgSealedMessage(
          title: '$_gameLabel sealed browsing is temporarily offline',
          actionLabel: 'Retry',
          onAction: _load,
        );
      case MtgSealedCatalogStatusV1.error:
        return _MtgSealedMessage(
          title: '$_gameLabel sealed products could not load',
          actionLabel: 'Retry',
          onAction: _load,
        );
      case MtgSealedCatalogStatusV1.disabled:
        return _MtgSealedMessage(
          title: '$_gameLabel sealed browsing is temporarily unavailable',
        );
    }
  }
}

class _MtgSealedGrid extends StatelessWidget {
  const _MtgSealedGrid({required this.rows});

  final List<MtgSealedCatalogRowV1> rows;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 900
            ? 5
            : constraints.maxWidth >= 620
            ? 4
            : 2;
        return GridView.builder(
          key: const Key('mtg-sealed-grid'),
          scrollCacheExtent: const ScrollCacheExtent.pixels(0),
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.56,
          ),
          itemCount: rows.length,
          itemBuilder: (context, index) =>
              _MtgSealedProductTile(row: rows[index]),
        );
      },
    );
  }
}

class _MtgSealedProductTile extends StatelessWidget {
  const _MtgSealedProductTile({required this.row});

  final MtgSealedCatalogRowV1 row;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(7),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ColoredBox(
                color: theme.colorScheme.surfaceContainerLowest,
                child: SizedBox.expand(
                  child: row.imageUrl == null
                      ? const Icon(Icons.inventory_2_outlined, size: 40)
                      : CachedNetworkImage(
                          imageUrl: row.imageUrl!,
                          fit: BoxFit.contain,
                          memCacheWidth: 360,
                          maxWidthDiskCache: 720,
                          fadeInDuration: const Duration(milliseconds: 120),
                          placeholder: (_, _) => const Center(
                            child: SizedBox.square(
                              dimension: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                          errorWidget: (_, _, _) => const Center(
                            child: Icon(Icons.broken_image_outlined, size: 34),
                          ),
                        ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    row.canonicalName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    '${_packageLabel(row.packageForm)} - ${const {'en': 'English', 'ja': 'Japanese', 'zh': 'Chinese', 'ko': 'Korean', 'fr': 'French', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'es': 'Spanish', 'ru': 'Russian'}[row.languageCode] ?? row.languageCode}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'MARKET',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        '\$${row.marketPrice.toStringAsFixed(2)}',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _packageLabel(String value) {
    return value
        .split('_')
        .where((part) => part.isNotEmpty)
        .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }
}

class _MtgSealedMessage extends StatelessWidget {
  const _MtgSealedMessage({
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.inventory_2_outlined, size: 42),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 16),
              FilledButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}
