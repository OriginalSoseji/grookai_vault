import 'package:flutter/material.dart';

import '../../services/grookai_objects/grookai_object_export_service.dart';
import 'grookai_object.dart';
import 'grookai_object_atoms.dart';
import 'grookai_object_frame.dart';
import 'grookai_object_renderer.dart';
import 'grookai_object_skin.dart';

class GrookaiObjectDestinationExportRenderer extends StatelessWidget {
  const GrookaiObjectDestinationExportRenderer({
    super.key,
    required this.repaintBoundaryKey,
    required this.object,
    required this.destination,
    required this.showFront,
  });

  final GlobalKey repaintBoundaryKey;
  final GrookaiObject object;
  final GrookaiObjectExportDestination destination;
  final bool showFront;

  static Size logicalSizeFor(GrookaiObjectExportDestination destination) {
    switch (destination) {
      case GrookaiObjectExportDestination.instagramFeed:
        return const Size(360, 450);
      case GrookaiObjectExportDestination.story:
        return const Size(360, 640);
      case GrookaiObjectExportDestination.ebayListing:
        return const Size(360, 360);
      case GrookaiObjectExportDestination.saveImage:
        return const Size(GrookaiObjectFrame.width, GrookaiObjectFrame.height);
    }
  }

  @override
  Widget build(BuildContext context) {
    GrookaiObjectExportService.validateDestination(object, destination);
    final size = logicalSizeFor(destination);
    return RepaintBoundary(
      key: repaintBoundaryKey,
      child: SizedBox.fromSize(
        size: size,
        child: switch (destination) {
          GrookaiObjectExportDestination.saveImage => _NativeCardExport(
            object: object,
            showFront: showFront,
          ),
          GrookaiObjectExportDestination.instagramFeed => _SocialExport(
            object: object,
            showFront: showFront,
            size: size,
          ),
          GrookaiObjectExportDestination.story => _SocialExport(
            object: object,
            showFront: showFront,
            size: size,
            storySafeZone: true,
          ),
          GrookaiObjectExportDestination.ebayListing => _EbayListingExport(
            object: object,
          ),
        },
      ),
    );
  }
}

class _NativeCardExport extends StatelessWidget {
  const _NativeCardExport({required this.object, required this.showFront});

  final GrookaiObject object;
  final bool showFront;

  @override
  Widget build(BuildContext context) {
    return GrookaiObjectRenderer(object: object, showFront: showFront);
  }
}

class _SocialExport extends StatelessWidget {
  const _SocialExport({
    required this.object,
    required this.showFront,
    required this.size,
    this.storySafeZone = false,
  });

  final GrookaiObject object;
  final bool showFront;
  final Size size;
  final bool storySafeZone;

  @override
  Widget build(BuildContext context) {
    final tokens = grookaiObjectTokens[object.skin]!;
    final topInset = storySafeZone ? 84.0 : 22.0;
    final bottomInset = storySafeZone ? 84.0 : 24.0;
    final cardScale = storySafeZone ? 0.48 : 0.54;
    final cardWidth = GrookaiObjectFrame.width * cardScale;
    final cardHeight = GrookaiObjectFrame.height * cardScale;

    return DecoratedBox(
      decoration: BoxDecoration(gradient: tokens.background),
      child: Padding(
        padding: EdgeInsets.fromLTRB(24, topInset, 24, bottomInset),
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: SizedBox(
                  width: cardWidth,
                  height: cardHeight,
                  child: FittedBox(
                    fit: BoxFit.contain,
                    child: SizedBox(
                      width: GrookaiObjectFrame.width,
                      height: GrookaiObjectFrame.height,
                      child: GrookaiObjectRenderer(
                        object: object,
                        showFront: showFront,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            _SocialOverlay(object: object),
          ],
        ),
      ),
    );
  }
}

class _SocialOverlay extends StatelessWidget {
  const _SocialOverlay({required this.object});

  final GrookaiObject object;

  @override
  Widget build(BuildContext context) {
    final tokens = grookaiObjectTokens[object.skin]!;
    final title = _titleFor(object);
    final subtitle = _subtitleFor(object);
    final price = _priceFor(object);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: tokens.primaryText.withValues(
          alpha: object.skin == GrookaiObjectSkin.onyx ? 0.06 : 0.09,
        ),
        border: Border.all(color: tokens.mutedText.withValues(alpha: 0.18)),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
        child: Row(
          children: [
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: serifTitle(tokens, size: 26),
                  ),
                  if (subtitle.isNotEmpty) ...[
                    const SizedBox(height: 5),
                    Text(
                      subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: monoLabel(tokens, size: 9.5),
                    ),
                  ],
                ],
              ),
            ),
            if (price != null) ...[
              const SizedBox(width: 14),
              Text(
                '\$${price.toStringAsFixed(0)}',
                style: monoLabel(
                  tokens,
                  size: 23,
                  color: tokens.accent,
                  weight: FontWeight.w800,
                  letterSpacing: 0,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EbayListingExport extends StatelessWidget {
  const _EbayListingExport({required this.object});

  final GrookaiObject object;

  @override
  Widget build(BuildContext context) {
    if (object.type == 'lot') {
      return _EbayLotListingExport(object: object);
    }
    final imageUrl = _imageUrlFor(object);
    final condition = _conditionFor(object);
    return ColoredBox(
      color: const Color(0xFFF5F5F2),
      child: Stack(
        children: [
          Center(
            child: imageUrl == null
                ? const CardArtPlaceholder(width: 238, height: 334)
                : GrookaiObjectNetworkImage(
                    imageUrl: imageUrl,
                    width: 248,
                    height: 334,
                    fit: BoxFit.contain,
                    borderRadius: BorderRadius.circular(10),
                  ),
          ),
          Positioned(
            top: 18,
            right: 18,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: const Color(0xEFFFFFFF),
                border: Border.all(color: const Color(0x1F000000)),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                child: Text(
                  condition,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF222222),
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EbayLotListingExport extends StatelessWidget {
  const _EbayLotListingExport({required this.object});

  final GrookaiObject object;

  @override
  Widget build(BuildContext context) {
    final items = _itemMapsFor(object);
    final visibleItems = items.take(12).toList(growable: false);
    final columnCount = visibleItems.length <= 4 ? 2 : 4;
    return ColoredBox(
      color: const Color(0xFFF5F5F2),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(28, 36, 28, 28),
            child: GridView.count(
              crossAxisCount: columnCount,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 0.84,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                for (final item in visibleItems)
                  _EbayLotImageTile(imageUrl: _imageUrlForItem(item)),
              ],
            ),
          ),
          Positioned(
            top: 18,
            right: 18,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: const Color(0xEFFFFFFF),
                border: Border.all(color: const Color(0x1F000000)),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                child: Text(
                  '${items.length} card lot',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF222222),
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EbayLotImageTile extends StatelessWidget {
  const _EbayLotImageTile({required this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0x14000000)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(3),
        child: imageUrl == null
            ? const CardArtPlaceholder(width: 82, height: 119)
            : GrookaiObjectNetworkImage(
                imageUrl: imageUrl!,
                width: 82,
                height: 119,
                fit: BoxFit.contain,
                borderRadius: BorderRadius.circular(6),
              ),
      ),
    );
  }
}

String _titleFor(GrookaiObject object) {
  final fields = object.fields;
  final title = fields['title'];
  if (title is String && title.trim().isNotEmpty) {
    return title.trim();
  }
  final cardName = fields['cardName'];
  if (cardName is String && cardName.trim().isNotEmpty) {
    return cardName.trim();
  }
  return 'Grookai Object';
}

String _subtitleFor(GrookaiObject object) {
  final fields = object.fields;
  if (object.type == 'memory') {
    final story = fields['storyText'];
    if (story is String && story.trim().isNotEmpty) {
      return story.trim();
    }
  }
  final setLine = fields['setLine'];
  if (setLine is String && setLine.trim().isNotEmpty) {
    return setLine.trim().toUpperCase();
  }
  final items = fields['items'];
  if (items is List) {
    return '${items.length} cards';
  }
  return '';
}

double? _priceFor(GrookaiObject object) {
  final fields = object.fields;
  final value = object.type == 'lot' ? fields['bundlePrice'] : fields['price'];
  return value is num ? value.toDouble() : null;
}

String _conditionFor(GrookaiObject object) {
  final fields = object.fields;
  final condition = fields['condition'];
  if (condition is String && condition.trim().isNotEmpty) {
    return condition.trim();
  }
  final items = fields['items'];
  if (items is List && items.isNotEmpty) {
    final first = items.first;
    if (first is Map && first['condition'] is String) {
      return (first['condition'] as String).trim();
    }
  }
  return 'Raw';
}

String? _imageUrlFor(GrookaiObject object) {
  final fields = object.fields;
  final direct = fields['cardImageUrl'];
  if (direct is String && direct.trim().isNotEmpty) {
    return direct.trim();
  }
  final items = fields['items'];
  if (items is List && items.isNotEmpty) {
    final first = items.first;
    if (first is Map && first['imageUrl'] is String) {
      final url = (first['imageUrl'] as String).trim();
      return url.isEmpty ? null : url;
    }
  }
  return null;
}

List<Map<String, dynamic>> _itemMapsFor(GrookaiObject object) {
  final items = object.fields['items'];
  if (items is! List) {
    return const <Map<String, dynamic>>[];
  }
  return items
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList(growable: false);
}

String? _imageUrlForItem(Map<String, dynamic> item) {
  final imageUrl = item['imageUrl'];
  if (imageUrl is! String) {
    return null;
  }
  final normalized = imageUrl.trim();
  return normalized.isEmpty ? null : normalized;
}
