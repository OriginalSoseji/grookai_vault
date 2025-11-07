import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:grookai_vault/core/telemetry.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/app/route_names.dart';
import 'package:grookai_vault/theme/thunder_palette.dart';
import '../../models/wall_feed_item.dart';
import '../../services/wall_feed_service.dart';
import 'widgets/card_frame.dart';
import 'widgets/price_pill.dart';
import 'widgets/filter_sheet.dart';
import '../wall/create_listing_page.dart';
import '../dev/diagnostics_page.dart';

class ExploreFeedPage extends StatefulWidget {
  final String? q;
  final List<String>? conditions;
  final int? minPriceCents;
  final int? maxPriceCents;
  const ExploreFeedPage({super.key, this.q, this.conditions, this.minPriceCents, this.maxPriceCents});

  @override
  State<ExploreFeedPage> createState() => _ExploreFeedPageState();
}

class _ExploreFeedPageState extends State<ExploreFeedPage> {
  final _service = WallFeedService();
  final _pc = PageController(viewportFraction: 1.0);
  final _items = <WallFeedItem>[];
  int _offset = 0;
  final int _limit = 10;
  bool _isFetching = false;
  bool _hasMore = true;
  String? _q;
  List<String>? _conds;
  int? _minCents;
  int? _maxCents;
  String? _error;
  Timer? _impressionTimer;

  @override
  void initState() {
    super.initState();
    _q = widget.q;
    _conds = widget.conditions;
    _minCents = widget.minPriceCents;
    _maxCents = widget.maxPriceCents;
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetch(first: true));
  }

  @override
  void dispose() {
    _pc.dispose();
    _impressionTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetch({bool first = false}) async {
    if (_isFetching || (!_hasMore && !first)) return;
    setState(() { _isFetching = true; _error = null; });
    try {
      final page = await _service.fetch(
        limit: _limit,
        offset: _offset,
        q: _q,
        conditions: _conds,
        minPriceCents: _minCents,
        maxPriceCents: _maxCents,
      );
      setState(() {
        _items.addAll(page.items);
        _offset += _limit;
        _hasMore = page.items.length == _limit;
      });
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      if (mounted) setState(() { _isFetching = false; });
    }
  }

  void _onPageChanged(int index) {
    HapticFeedback.selectionClick();
    // Impression after 500ms visible
    _impressionTimer?.cancel();
    _impressionTimer = Timer(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      if (index >= 0 && index < _items.length) {
        Telemetry.log('explore_impression', { 'listingId': _items[index].listingId, 'index': index });
      }
    });
    // Prefetch next
    if (index >= _items.length - 2 && _hasMore) {
      _fetch();
    }
    // Memory cap
    if (_items.length > 60 && index > 25) {
      setState(() {
        _items.removeRange(0, 20);
        _offset = _offset - 20; // logical shift for next fetches
      });
    }
  }

  void _openFilters() {
    FilterSheet.show(
      context,
      initial: ExploreFilters(
        conditions: _conds ?? const [],
        minPriceCents: _minCents,
        maxPriceCents: _maxCents,
        q: _q,
      ),
      onApply: (f) {
        setState(() {
          _q = f.q; _conds = f.conditions; _minCents = f.minPriceCents; _maxCents = f.maxPriceCents;
          _items.clear(); _offset = 0; _hasMore = true; _error = null;
        });
        _fetch(first: true);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onLongPress: () {
            if (kDebugMode || kProfileMode) {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const DiagnosticsPage()),
              );
            }
          },
          child: const Text('Explore'),
        ),
        actions: [
          IconButton(onPressed: _openFilters, icon: const Icon(Icons.filter_alt_outlined)),
        ],
      ),
      body: _buildBody(),
      floatingActionButton: (kDebugMode || kProfileMode)
          ? FloatingActionButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateListingPage()),
                );
              },
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _buildBody() {
    if (_items.isEmpty && _isFetching) {
      return const Center(child: _ShimmerCard());
    }
    if (_items.isEmpty && _error != null) {
      return _ErrorView(message: 'Failed to load. Tap to retry', onRetry: () => _fetch(first: true));
    }
    if (_items.isEmpty) {
      return _EmptyView(onReset: () { setState(() { _q=null; _conds=[]; _minCents=null; _maxCents=null; }); _fetch(first:true); });
    }
    return PageView.builder(
      controller: _pc,
      scrollDirection: Axis.vertical,
      onPageChanged: _onPageChanged,
      itemCount: _hasMore ? _items.length + 1 : _items.length,
      itemBuilder: (context, index) {
        if (index >= _items.length) {
          return const Center(child: _ShimmerCard());
        }
        final it = _items[index];
        final img = it.imageUrlOrFallback();
        final mv = it.mvPriceMid;
        final mvText = (mv != null) ? '\$${mv.toString()}' : null;
        final age = it.mvObservedAt;
        final ageText = (age != null) ? 'observed ${_humanAge(age)}' : null;

        return CardFrame(
          listingId: it.listingId,
          imageUrl: img,
          overlays: (ctx) {
            return Stack(children: [
              // Top-left: set code â€¢ number
              Positioned(
                top: GVSpacing.s16,
                left: GVSpacing.s16,
                child: Text(
                  it.setCode + ' â€¢ ' + it.cardNumber,
                  style: const TextStyle(color: Thunder.onSurface, fontWeight: FontWeight.w600),
                ),
              ),
              // Top-right: overflow
              Positioned(
                top: GVSpacing.s8,
                right: GVSpacing.s8,
                child: IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.more_horiz, color: Thunder.onSurface),
                ),
              ),
              // Bottom info + actions
              Positioned(
                left: GVSpacing.s16,
                right: GVSpacing.s16,
                bottom: GVSpacing.s24,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: PricePill(
                        priceText: it.priceText(),
                        condition: it.conditionText(),
                        seller: it.sellerDisplayName ?? 'Seller',
                        mvMidText: mvText,
                        ageText: ageText,
                      ),
                    ),
                    const SizedBox(width: 12),
                    _CircleBtn(icon: Icons.favorite_border, onTap: () {}),
                    const SizedBox(width: 8),
                    _CircleBtn(icon: Icons.north_east, onTap: () {
                      Navigator.of(context).pushNamed(
                        RouteNames.cardDetail,
                        arguments: { 'card_print_id': it.cardPrintId, 'listing_id': it.listingId },
                      );
                      Telemetry.log('explore_open_detail', { 'listingId': it.listingId });
                    }),
                  ],
                ),
              ),
            ]);
          },
        );
      },
    );
  }
}

class _CircleBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _CircleBtn({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: Material(
        color: Thunder.surfaceAlt,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(width: 44, height: 44, child: Icon(icon, color: Thunder.onSurface)),
        ),
      ),
    );
  }
}

class _ShimmerCard extends StatefulWidget {
  const _ShimmerCard();
  @override
  State<_ShimmerCard> createState() => _ShimmerCardState();
}

class _ShimmerCardState extends State<_ShimmerCard> with SingleTickerProviderStateMixin {
  late final AnimationController _ac = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();
  @override
  void dispose() { _ac.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ac,
      builder: (context, _) {
        return Center(
          child: AspectRatio(
            aspectRatio: 3/4,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: LinearGradient(
                  begin: Alignment(-1 + 2*_ac.value, -1),
                  end: Alignment(1 + 2*_ac.value, 1),
                  colors: const [Color(0xFF2A2A2A), Color(0xFF3A3A3A), Color(0xFF2A2A2A)],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _EmptyView extends StatelessWidget {
  final VoidCallback onReset;
  const _EmptyView({required this.onReset});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('No listings match your filters. ðŸ˜¶â€ðŸŒ«ï¸'),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: onReset, child: const Text('Reset filters')),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: GestureDetector(
        onTap: onRetry,
        child: DecoratedBox(
          decoration: BoxDecoration(color: Thunder.surfaceAlt, borderRadius: BorderRadius.circular(18)),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Text(message, style: const TextStyle(color: Thunder.onSurface)),
          ),
        ),
      ),
    );
  }
}

String _humanAge(DateTime ts) {
  final d = DateTime.now().toUtc().difference(ts.toUtc());
  if (d.inDays >= 1) return '${d.inDays}d ago';
  if (d.inHours >= 1) return '${d.inHours}h ago';
  if (d.inMinutes >= 1) return '${d.inMinutes}m ago';
  return 'just now';
}

