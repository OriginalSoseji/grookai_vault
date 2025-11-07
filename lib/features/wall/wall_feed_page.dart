import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/app/route_names.dart';
import 'package:grookai_vault/features/wall/wall_refresh_bus.dart';
import 'package:grookai_vault/ui/widgets/card_thumb.dart';
import 'package:grookai_vault/core/net/supa_timeout.dart';

class WallFeedPage extends StatefulWidget {
  const WallFeedPage({super.key});
  @override
  State<WallFeedPage> createState() => _WallFeedPageState();
}

class _WallFeedPageState extends State<WallFeedPage> {
  final _client = Supabase.instance.client;
  final List<Map<String, dynamic>> _rows = [];
  bool _loading = false;
  bool _end = false;
  static const int _pageSize = 24;
  final _controller = ScrollController();
  DateTime _lastLoad = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastRefreshTrigger = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _loadMore(reset: true);
    _controller.addListener(_onScroll);
    WallRefreshBus.instance.register(silentRefreshIfStale);
  }

  void _onScroll() {
    if (_controller.position.pixels >= _controller.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  @override
  void dispose() {
    WallRefreshBus.instance.unregister(silentRefreshIfStale);
    _controller.dispose();
    super.dispose();
  }

  Future<void> _loadMore({bool reset = false}) async {
    if (_loading || _end) return;
    setState(() => _loading = true);
    try {
      final from = reset ? 0 : _rows.length;
      final to = from + _pageSize - 1;
      final data = await _client
          .from('wall_feed_view')
          .select('listing_id,card_id,title,price_cents,thumb_url,created_at')
          .order('created_at', ascending: false)
          .range(from, to)
          .withReadTimeout();
      final list = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      if (reset) _rows.clear();
      _rows.addAll(list);
      if (list.length < _pageSize) _end = true;
      _lastLoad = DateTime.now();
    } catch (e) {
      // ignore: avoid_print
      // ignore: use_build_context_synchronously
      debugPrint('[WALL] load error $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refreshNow({bool showErrorSnack = true}) async {
    final now = DateTime.now();
    if (now.difference(_lastRefreshTrigger).inSeconds < 2) {
      debugPrint('[WALL_REFRESH] debounce skip');
      return;
    }
    _lastRefreshTrigger = now;
    debugPrint('[WALL_REFRESH] pull-to-refresh start');
    try {
      try {
        await _client.rpc('rpc_refresh_wall').withReadTimeout();
      } catch (e) {
        debugPrint('[WALL_REFRESH] rpc failed (ignored): $e');
      }
      _end = false;
      await _loadMore(reset: true);
      debugPrint('[WALL_REFRESH] pull-to-refresh ok');
    } catch (e) {
      debugPrint('[WALL_REFRESH] pull-to-refresh fail: $e');
      if (mounted && showErrorSnack) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Couldn't refresh. Check connection.")),
        );
      }
    }
  }

  Future<void> silentRefreshIfStale() async {
    if (_loading) {
      debugPrint('[WALL_REFRESH] tab-activate skip (loading)');
      return;
    }
    final age = DateTime.now().difference(_lastLoad);
    final stale = age.inSeconds > 90 || _rows.isEmpty;
    if (!stale) {
      debugPrint('[WALL_REFRESH] tab-activate skip(too-recent)');
      return;
    }
    debugPrint('[WALL_REFRESH] tab-activate start');
    try {
      _end = false;
      await _loadMore(reset: true);
      debugPrint('[WALL_REFRESH] tab-activate ok');
    } catch (e) {
      debugPrint('[WALL_REFRESH] tab-activate fail: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Public Wall')),
      body: _rows.isEmpty && _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refreshNow,
              child: GridView.builder(
                controller: _controller,
                padding: const EdgeInsets.all(12),
                physics: const AlwaysScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: 3 / 4,
                ),
                itemCount: _rows.length + (_loading ? 3 : 0),
                itemBuilder: (context, i) {
                  if (i >= _rows.length) {
                    return Container(color: Colors.grey.shade200);
                  }
                  final r = _rows[i];
                  final url = (r['thumb_url'] ?? r['image_url'] ?? '').toString();
                  return GestureDetector(
                    onTap: () => Navigator.of(context).pushNamed(RouteNames.cardDetail, arguments: {
                      'cardId': (r['card_id'] ?? '').toString(),
                    }),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        color: Colors.grey.shade100,
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: url.isEmpty
                          ? const ColoredBox(color: Colors.black12)
                          : CardThumb(url: url, logicalWidth: 180, logicalHeight: 240),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
