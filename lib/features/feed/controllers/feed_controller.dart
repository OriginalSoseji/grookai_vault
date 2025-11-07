import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/feed_item.dart';
import 'package:grookai_vault/ui/haptics.dart';

class FeedController extends ChangeNotifier {
  final List<FeedItem> items = <FeedItem>[];
  bool loading = false;
  bool error = false;
  bool endReached = false;
  int _page = 0;
  Timer? _debounce;

  Future<void> refresh() async {
    _page = 0;
    endReached = false;
    items.clear();
    notifyListeners();
    await _loadPage(reset: true);
  }

  Future<void> loadMore() async {
    if (loading || endReached) return;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 200), () => _loadPage());
  }

  Future<void> _loadPage({bool reset = false}) async {
    loading = true;
    error = false;
    notifyListeners();
    try {
      // TODO: wire to backend feed endpoint; using placeholder rows
      await Future<void>.delayed(const Duration(milliseconds: 150));
      final fetched = List.generate(12, (i) {
        final id = 'p${_page}_$i';
        return FeedItem(
          id: id,
          title: 'Card $id',
          cardId: id,
          thumbUrl3x4: null,
        );
      });
      if (reset) items.clear();
      items.addAll(fetched);
      _page++;
      if (_page > 5) endReached = true; // stub
    } catch (_) {
      error = true;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> toggleWishlist(FeedItem it) async {
    final idx = items.indexWhere((e) => e.id == it.id);
    if (idx < 0) return;
    final prev = items[idx];
    items[idx] = prev.copyWith(wishlisted: !prev.wishlisted);
    notifyListeners();
    await Haptics.light();
    try {
      // TODO: wire to VaultService.toggleWishlist
      await Future<void>.delayed(const Duration(milliseconds: 150));
    } catch (_) {
      // rollback on error
      items[idx] = prev;
      notifyListeners();
    }
  }
}

