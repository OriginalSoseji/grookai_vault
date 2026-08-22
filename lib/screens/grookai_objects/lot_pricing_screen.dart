import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../models/grookai_sale_listing.dart';
import '../../services/diagnostics/grookai_crash_reporting_service.dart';
import '../../services/grookai_objects/grookai_object_export_service.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/grookai_objects/grookai_object.dart';
import '../../widgets/grookai_objects/grookai_object_destination_export_renderer.dart';
import '../../widgets/grookai_objects/grookai_object_share_destination_sheet.dart';
import '../../widgets/grookai_objects/grookai_object_skin.dart';
import '../../widgets/grookai_objects/grookai_object_skin_picker.dart';

class LotPricingScreen extends StatefulWidget {
  const LotPricingScreen({
    super.key,
    required this.source,
    required this.metadata,
    this.exportService = const GrookaiObjectExportService(),
  });

  final GrookaiLotListingSource source;
  final Map<String, dynamic> metadata;
  final GrookaiObjectExportService exportService;

  @override
  State<LotPricingScreen> createState() => _LotPricingScreenState();
}

class _LotPricingScreenState extends State<LotPricingScreen> {
  late final TextEditingController _titleController;
  late final TextEditingController _bundlePriceController;
  late final List<TextEditingController> _itemPriceControllers;
  final GlobalKey _frontExportBoundaryKey = GlobalKey();
  final GlobalKey _backExportBoundaryKey = GlobalKey();
  GrookaiObjectSkin _skin = GrookaiObjectSkin.onyx;
  GrookaiObjectExportDestination _exportDestination =
      GrookaiObjectExportDestination.saveImage;
  bool _showFront = true;
  bool _sharing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.source.title);
    final estimated = widget.source.items.fold<double>(
      0,
      (sum, item) => sum + item.price,
    );
    _bundlePriceController = TextEditingController(
      text: estimated <= 0 ? '' : estimated.toStringAsFixed(2),
    );
    _itemPriceControllers = [
      for (final item in widget.source.items)
        TextEditingController(
          text: item.price <= 0 ? '' : item.price.toStringAsFixed(2),
        ),
    ];
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bundlePriceController.dispose();
    for (final controller in _itemPriceControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  GrookaiObject get _previewObject {
    final items = <GrookaiLotListingItemSource>[];
    for (var index = 0; index < widget.source.items.length; index += 1) {
      final item = widget.source.items[index];
      items.add(
        GrookaiLotListingItemSource(
          cardPrintId: item.cardPrintId,
          gvviId: item.gvviId,
          cardName: item.cardName,
          setName: item.setName,
          setCode: item.setCode,
          collectorNumber: item.collectorNumber,
          printedTotal: item.printedTotal,
          variantLabel: item.variantLabel,
          printingIdentityLabel: item.printingIdentityLabel,
          condition: item.condition,
          marketPrice: item.marketPrice,
          price: _parseMoney(_itemPriceControllers[index].text) ?? item.price,
          imageUrl: item.imageUrl,
          fallbackImageUrl: item.fallbackImageUrl,
        ),
      );
    }
    final source = GrookaiLotListingSource(
      title: _titleController.text,
      items: items,
      sellerHandle: widget.source.sellerHandle,
      sellerRating: widget.source.sellerRating,
      sellerTradeCount: widget.source.sellerTradeCount,
    );
    return GrookaiLotListingAdapter.fromTerms(
      source: source,
      skin: _skin,
      bundlePrice:
          _parseMoney(_bundlePriceController.text) ??
          items.fold<double>(0, (sum, item) => sum + item.price),
      listingNo: GrookaiLotListingAdapter.listingNoFor(
        widget.metadata['card_print_ids'] is Iterable
            ? (widget.metadata['card_print_ids'] as Iterable).map(
                (id) => id.toString(),
              )
            : const <String>[],
      ),
      metadata: widget.metadata,
    );
  }

  bool _validateForShare() {
    final bundlePrice = _parseMoney(_bundlePriceController.text);
    if (bundlePrice == null || bundlePrice <= 0) {
      setState(() {
        _error = 'Enter a bundle price greater than 0.';
      });
      return false;
    }
    setState(() {
      _error = null;
    });
    return true;
  }

  Future<void> _shareCurrentCard() async {
    if (_sharing || !_validateForShare()) {
      return;
    }

    final destination = await showGrookaiObjectShareDestinationSheet(
      context: context,
      object: _previewObject,
    );
    if (destination == null || !mounted) {
      return;
    }

    setState(() {
      _sharing = true;
      _error = null;
      _exportDestination = destination;
    });
    final sharePositionOrigin =
        GrookaiObjectExportService.sharePositionOriginFor(context);
    var stage = 'precache_images';

    try {
      final object = _previewObject;
      await _precacheLotImages();
      stage = 'capture_front';
      final front = await widget.exportService.exportObjectPng(
        object: object,
        destination: destination,
        repaintBoundaryKey: _frontExportBoundaryKey,
      );
      stage = 'capture_back';
      final back = await widget.exportService.exportObjectPng(
        object: object,
        destination: destination,
        repaintBoundaryKey: _backExportBoundaryKey,
      );
      stage = 'open_share_sheet';
      await widget.exportService.sharePngs(
        bytes: [front, back],
        fileNames: [
          GrookaiObjectExportService.sidedFileNameFor(
            type: 'lot-${destination.slug}',
            title: _exportTitle(object),
            side: 'front',
          ),
          GrookaiObjectExportService.sidedFileNameFor(
            type: 'lot-${destination.slug}',
            title: _exportTitle(object),
            side: 'back',
          ),
        ],
        subject: 'Grookai lot card',
        text: 'Front and details shared from Grookai Vault',
        sharePositionOrigin: sharePositionOrigin,
      );
    } catch (error, stackTrace) {
      GrookaiCrashReportingService.recordNonFatalError(
        error,
        stackTrace,
        reason: 'grookai_object_share_failed',
        context: <String, Object?>{
          'operation': 'share_png',
          'stage': stage,
          'surface': 'price_lot',
          'object_type': 'lot',
          'destination': _exportDestination.slug,
        },
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error is _LotShareException
            ? error.message
            : switch (stage) {
                'capture_front' =>
                  'Unable to generate the lot front image. Please try again.',
                'capture_back' =>
                  'Unable to generate the lot back image. Please try again.',
                'open_share_sheet' =>
                  'Both images were generated, but sharing could not be opened.',
                _ => 'Unable to prepare the lot images. Please try again.',
              };
      });
    } finally {
      if (mounted) {
        setState(() => _sharing = false);
      }
    }
  }

  Future<void> _precacheLotImages() async {
    for (final item in widget.source.items) {
      final candidates = <String>[
        if ((item.imageUrl ?? '').trim().isNotEmpty) item.imageUrl!.trim(),
        if ((item.fallbackImageUrl ?? '').trim().isNotEmpty)
          item.fallbackImageUrl!.trim(),
      ];
      if (candidates.isEmpty) {
        continue;
      }

      Object? lastError;
      var loaded = false;
      for (final imageUrl in candidates.toSet()) {
        Object? imageError;
        try {
          await precacheImage(
            CachedNetworkImageProvider(imageUrl),
            context,
            onError: (error, stackTrace) => imageError = error,
          ).timeout(const Duration(seconds: 20));
          if (imageError == null) {
            loaded = true;
            break;
          }
          lastError = imageError;
        } catch (error) {
          lastError = error;
        }
      }
      if (!loaded) {
        throw _LotShareException(
          'The image for ${item.cardName} could not be loaded: $lastError',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return Scaffold(
      appBar: AppBar(title: const Text('Price Lot')),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: EdgeInsets.fromLTRB(16, 10, 16, 24 + bottomInset),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Stack(
                    children: [
                      if (_showFront)
                        _backExportRenderer()
                      else
                        _frontExportRenderer(),
                      if (_showFront)
                        _frontExportRenderer()
                      else
                        _backExportRenderer(),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              SegmentedButton<bool>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment<bool>(
                    value: true,
                    icon: Icon(Icons.flip_to_front_rounded),
                    label: Text('Front'),
                  ),
                  ButtonSegment<bool>(
                    value: false,
                    icon: Icon(Icons.flip_to_back_rounded),
                    label: Text('Back'),
                  ),
                ],
                selected: {_showFront},
                onSelectionChanged: (selection) =>
                    setState(() => _showFront = selection.single),
              ),
              const SizedBox(height: 18),
              Text(
                'Skin',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              GrookaiObjectSkinPicker(
                selected: _skin,
                onChanged: (skin) => setState(() => _skin = skin),
              ),
              const SizedBox(height: 18),
              TextField(
                controller: _titleController,
                decoration: const InputDecoration(labelText: 'Lot title'),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              Text(
                '${widget.source.items.length} cards',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              for (
                var index = 0;
                index < widget.source.items.length;
                index += 1
              )
                _LotItemPriceRow(
                  item: widget.source.items[index],
                  controller: _itemPriceControllers[index],
                  onChanged: () => setState(() {}),
                ),
              const SizedBox(height: 4),
              Text(
                'Estimated value is itemized above. Set one bundle price for the lot.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _bundlePriceController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Bundle price',
                  prefixText: r'$',
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 14),
              if (_error != null) ...[
                const SizedBox(height: 4),
                Text(
                  _error!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.error,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
              FilledButton.icon(
                onPressed: _sharing ? null : _shareCurrentCard,
                icon: _sharing
                    ? const SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.ios_share_outlined),
                label: Text(_sharing ? 'Preparing both sides...' : 'Share lot'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _frontExportRenderer() {
    return GrookaiObjectDestinationExportRenderer(
      repaintBoundaryKey: _frontExportBoundaryKey,
      object: _previewObject,
      destination: _exportDestination,
      showFront: true,
    );
  }

  Widget _backExportRenderer() {
    return GrookaiObjectDestinationExportRenderer(
      repaintBoundaryKey: _backExportBoundaryKey,
      object: _previewObject,
      destination: _exportDestination,
      showFront: false,
    );
  }
}

class _LotShareException implements Exception {
  const _LotShareException(this.message);

  final String message;

  @override
  String toString() => message;
}

class _LotItemPriceRow extends StatelessWidget {
  const _LotItemPriceRow({
    required this.item,
    required this.controller,
    required this.onChanged,
  });

  final GrookaiLotListingItemSource item;
  final TextEditingController controller;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          CardSurfaceArtwork(
            label: item.cardName,
            imageUrl: item.imageUrl,
            fallbackImageUrl: item.fallbackImageUrl,
            width: 52,
            height: 72,
            borderRadius: 8,
            padding: EdgeInsets.zero,
            showShadow: false,
            enableTapToZoom: false,
            frame: CardArtworkFrame.soft,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.cardName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (item.setAndNumberLine.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    item.setAndNumberLine,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                if ((item.variantLabel ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    item.variantLabel!.trim(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
                const SizedBox(height: 5),
                Text(
                  item.condition,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (item.marketPrice != null && item.marketPrice! > 0) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Market \$${item.marketPrice!.toStringAsFixed(2)}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 108,
            child: TextField(
              controller: controller,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'My price',
                prefixText: r'$',
              ),
              onChanged: (_) => onChanged(),
            ),
          ),
        ],
      ),
    );
  }
}

double? _parseMoney(String value) {
  final parsed = double.tryParse(value.trim());
  if (parsed == null || !parsed.isFinite || parsed < 0) {
    return null;
  }
  return double.parse(parsed.toStringAsFixed(2));
}

String _exportTitle(GrookaiObject object) {
  final fields = object.fields;
  final title = fields['title'];
  if (title is String && title.trim().isNotEmpty) {
    return title;
  }
  final cardName = fields['cardName'] ?? fields['card_name'];
  if (cardName is String && cardName.trim().isNotEmpty) {
    return cardName;
  }
  return object.type;
}
