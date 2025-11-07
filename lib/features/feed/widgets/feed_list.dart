import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/scrolling.dart';
import '../controllers/feed_controller.dart';
import '../models/feed_item.dart';

class FeedList extends StatefulWidget {
  final FeedController controller;
  const FeedList({super.key, required this.controller});
  @override
  State<FeedList> createState() => _FeedListState();
}

class _FeedListState extends State<FeedList> with AutomaticKeepAliveClientMixin {
  final _controller = ScrollController();
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    widget.controller.refresh();
    _controller.addListener(_onScroll);
  }

  void _onScroll() {
    final max = _controller.position.maxScrollExtent;
    final cur = _controller.position.pixels;
    if (max <= 0) return;
    if (cur / max > 0.8) widget.controller.loadMore();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return AnimatedBuilder(
      animation: widget.controller,
      builder: (context, _) {
        if (widget.controller.error) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Failed to load feed'),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: widget.controller.refresh, child: const Text('Retry')),
              ],
            ),
          );
        }
        if (widget.controller.items.isEmpty && widget.controller.loading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (widget.controller.items.isEmpty) {
          return const Center(child: Text('No items'));
        }
        final list = widget.controller.items;
        final grid = GridView.builder(
          key: const PageStorageKey('feed_grid'),
          controller: _controller,
          physics: platformPhysics(),
          padding: const EdgeInsets.all(12),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 3 / 4,
          ),
          itemCount: list.length,
          itemBuilder: (context, i) => _ThumbCell(item: list[i], onToggle: () => widget.controller.toggleWishlist(list[i])),
        );
        return RefreshIndicator(
          onRefresh: widget.controller.refresh,
          child: grid,
        );
      },
    );
  }
}

class _ThumbCell extends StatelessWidget {
  final FeedItem item;
  final VoidCallback onToggle;
  const _ThumbCell({required this.item, required this.onToggle});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).pushNamed('/rc-detail');
      },
      child: Stack(
        children: [
          Hero(
            tag: item.id,
            child: AspectRatio(
              aspectRatio: 3 / 4,
              child: item.thumbUrl3x4 == null
                  ? Container(color: Colors.grey.shade300)
                  : CachedNetworkImage(imageUrl: item.thumbUrl3x4!, fit: BoxFit.cover),
            ),
          ),
          Positioned(
            right: 6,
            top: 6,
            child: IconButton(
              visualDensity: VisualDensity.compact,
              iconSize: 18,
              icon: Icon(item.wishlisted ? Icons.favorite : Icons.favorite_border, color: Colors.pinkAccent),
              onPressed: onToggle,
            ),
          ),
        ],
      ),
    );
  }
}
