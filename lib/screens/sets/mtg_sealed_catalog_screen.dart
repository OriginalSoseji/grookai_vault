import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show ScrollCacheExtent;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/sealed/mtg_sealed_client_v1.dart';

class MtgSealedCatalogScreen extends StatefulWidget {
  const MtgSealedCatalogScreen({super.key, this.client});

  final MtgSealedClientV1? client;

  @override
  State<MtgSealedCatalogScreen> createState() => _MtgSealedCatalogScreenState();
}

class _MtgSealedCatalogScreenState extends State<MtgSealedCatalogScreen> {
  final TextEditingController _searchController = TextEditingController();
  late final MtgSealedClientV1 _client =
      widget.client ??
      MtgSealedClientV1(
        transport: SupabaseMtgSealedClientTransportV1(
          client: Supabase.instance.client,
        ),
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
    setState(() => _state = MtgSealedCatalogStateV1.loading);
    final next = await _client.load(
      query: _searchController.text.trim(),
      limit: 24,
    );
    if (mounted) setState(() => _state = next);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'MTG Sealed',
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
                onSubmitted: (_) => _load(),
                decoration: InputDecoration(
                  hintText: 'Search boxes, bundles, or decks',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: IconButton(
                    tooltip: 'Search',
                    onPressed: _load,
                    icon: const Icon(Icons.arrow_forward),
                  ),
                ),
              ),
            ),
            Expanded(child: _buildContent(context)),
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
            _load();
          },
        );
      case MtgSealedCatalogStatusV1.signedOut:
        return const _MtgSealedMessage(
          title: 'Sign in to browse MTG sealed products',
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
          title: 'MTG sealed browsing is temporarily offline',
          actionLabel: 'Retry',
          onAction: _load,
        );
      case MtgSealedCatalogStatusV1.error:
        return _MtgSealedMessage(
          title: 'MTG sealed products could not load',
          actionLabel: 'Retry',
          onAction: _load,
        );
      case MtgSealedCatalogStatusV1.disabled:
        return const _MtgSealedMessage(
          title: 'MTG sealed browsing is temporarily unavailable',
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
                    _packageLabel(row.packageForm),
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
