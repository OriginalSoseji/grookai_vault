import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../models/grookai_memory_card.dart';
import '../../services/diagnostics/grookai_crash_reporting_service.dart';
import '../../services/grookai_objects/grookai_object_export_service.dart';
import '../../services/grookai_objects/memory_card_print_service.dart';
import '../../services/vault/collector_memory_service.dart';
import '../../widgets/grookai_objects/grookai_object.dart';
import '../../widgets/grookai_objects/grookai_object_destination_export_renderer.dart';
import '../../widgets/grookai_objects/grookai_object_share_destination_sheet.dart';
import '../../widgets/grookai_objects/grookai_object_skin.dart';
import '../../widgets/grookai_objects/grookai_object_skin_picker.dart';
import '../vault/vault_manage_card_screen.dart';

class CollectorMemoryDetailScreen extends StatefulWidget {
  CollectorMemoryDetailScreen({
    super.key,
    required this.item,
    this.signedPhotoUrl,
    this.onViewCard,
    MemoryCardPrintService? printService,
    GrookaiObjectExportService? exportService,
  }) : printService = printService ?? MemoryCardPrintService(),
       exportService = exportService ?? const GrookaiObjectExportService();

  final OwnerCollectorMemory item;
  final String? signedPhotoUrl;
  final VoidCallback? onViewCard;
  final MemoryCardPrintService printService;
  final GrookaiObjectExportService exportService;

  @override
  State<CollectorMemoryDetailScreen> createState() =>
      _CollectorMemoryDetailScreenState();
}

class _CollectorMemoryDetailScreenState
    extends State<CollectorMemoryDetailScreen> {
  // A saved Memory opens on its story side. The card artwork remains
  // available on the front without replacing the Memory experience.
  bool _showFront = false;
  bool _printing = false;
  bool _sharing = false;
  GrookaiObjectSkin _skin = GrookaiObjectSkin.onyx;
  GrookaiObjectExportDestination _exportDestination =
      GrookaiObjectExportDestination.saveImage;
  final GlobalKey _exportBoundaryKey = GlobalKey();

  void _openCard() {
    final injectedAction = widget.onViewCard;
    if (injectedAction != null) {
      injectedAction();
      return;
    }

    final gvviId = widget.item.memory.gvviId.trim();
    if (gvviId.isEmpty) {
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => VaultManageCardScreen(gvviId: gvviId),
      ),
    );
  }

  Future<void> _openPrintMenu() async {
    if (_printing || _sharing) {
      return;
    }
    final action = await showModalBottomSheet<_MemoryPrintAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => const _MemoryPrintSheet(),
    );
    if (action == null || !mounted) {
      return;
    }
    await _print(action);
  }

  Future<void> _print(_MemoryPrintAction action) async {
    final previousSide = _showFront;
    setState(() => _printing = true);
    try {
      await _precachePrintImages();
      final memorySide = await _captureSide(showFront: false);
      Uint8List? cardSide;
      final mode = action == _MemoryPrintAction.frontAndBack
          ? MemoryCardPrintMode.frontAndBack
          : MemoryCardPrintMode.memoryInsert;
      if (mode == MemoryCardPrintMode.frontAndBack) {
        cardSide = await _captureSide(showFront: true);
      }
      if (mounted && _showFront != previousSide) {
        setState(() => _showFront = previousSide);
        await WidgetsBinding.instance.endOfFrame;
      }

      final fileName = _printFileName(widget.item.cardName);
      if (action == _MemoryPrintAction.sharePdf) {
        await widget.printService.shareMemoryPdf(
          memorySidePng: memorySide,
          mode: mode,
          fileName: fileName,
        );
      } else {
        await widget.printService.printMemory(
          memorySidePng: memorySide,
          cardSidePng: cardSide,
          mode: mode,
          documentName: fileName,
        );
      }
    } catch (error, stackTrace) {
      GrookaiCrashReportingService.recordNonFatalError(
        error,
        stackTrace,
        reason: 'collector_memory_print_failed',
        context: <String, Object?>{
          'memory_id': widget.item.memory.id,
          'card_print_id': widget.item.cardPrintId,
          'surface': 'collector_memory_detail',
          'operation': action.name,
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to prepare this Memory.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _printing = false);
      }
    }
  }

  Future<Uint8List> _captureSide({required bool showFront}) async {
    if (_showFront != showFront ||
        _exportDestination != GrookaiObjectExportDestination.saveImage) {
      setState(() {
        _showFront = showFront;
        _exportDestination = GrookaiObjectExportDestination.saveImage;
      });
    }
    await WidgetsBinding.instance.endOfFrame;
    return widget.exportService.capturePng(_exportBoundaryKey, pixelRatio: 3);
  }

  Future<void> _shareCurrentSide() async {
    if (_sharing || _printing) {
      return;
    }

    final object = _memoryObject;
    final destination = await showGrookaiObjectShareDestinationSheet(
      context: context,
      object: object,
    );
    if (destination == null || !mounted) {
      return;
    }

    final previousDestination = _exportDestination;
    setState(() {
      _sharing = true;
      _exportDestination = destination;
    });
    final sharePositionOrigin =
        GrookaiObjectExportService.sharePositionOriginFor(context);

    try {
      await _precachePrintImages();
      await WidgetsBinding.instance.endOfFrame;
      final bytes = await widget.exportService.exportObjectPng(
        object: object,
        destination: destination,
        repaintBoundaryKey: _exportBoundaryKey,
      );
      await widget.exportService.sharePng(
        bytes: bytes,
        fileName: GrookaiObjectExportService.fileNameFor(
          type: 'memory-${destination.slug}',
          title: widget.item.cardName,
        ),
        subject: 'Grookai memory card',
        text: 'Shared from Grookai Vault',
        sharePositionOrigin: sharePositionOrigin,
      );
    } catch (error, stackTrace) {
      GrookaiCrashReportingService.recordNonFatalError(
        error,
        stackTrace,
        reason: 'grookai_object_share_failed',
        context: <String, Object?>{
          'memory_id': widget.item.memory.id,
          'card_print_id': widget.item.cardPrintId,
          'surface': 'collector_memory_detail',
          'operation': 'share_png',
          'destination': destination.slug,
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to share this Memory.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _sharing = false;
          _exportDestination = previousDestination;
        });
      }
    }
  }

  Future<void> _precachePrintImages() async {
    final artwork = widget.item.catalogArtwork;
    await _precacheFirstAvailable([widget.signedPhotoUrl]);
    await _precacheFirstAvailable([
      artwork.primaryImageUrl,
      artwork.fallbackImageUrl,
    ]);
  }

  Future<void> _precacheFirstAvailable(List<String?> candidates) async {
    for (final candidate in candidates) {
      final url = (candidate ?? '').trim();
      if (url.isEmpty) {
        continue;
      }
      try {
        await precacheImage(CachedNetworkImageProvider(url), context);
        return;
      } catch (_) {
        // The renderer applies its own fallback or placeholder contract.
      }
    }
  }

  GrookaiObject get _memoryObject {
    final item = widget.item;
    final artwork = item.catalogArtwork;
    return GrookaiMemoryCardAdapter.fromMemory(
      memory: item.memory,
      source: GrookaiMemoryCardSource(
        cardName: item.cardName,
        setLine: item.setName,
        cardImageUrl: artwork.primaryImageUrl,
        cardImageFallbackUrl: artwork.fallbackImageUrl,
      ),
      skin: _skin,
      signedPhotoUrl: widget.signedPhotoUrl,
    );
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final memory = item.memory;
    final object = _memoryObject;
    final note = (memory.note ?? '').trim();
    final details = _memoryDetails(memory);
    final canOpenCard =
        widget.onViewCard != null || memory.gvviId.trim().isNotEmpty;

    return Scaffold(
      key: const Key('collector-memory-detail'),
      appBar: AppBar(
        title: const Text('Memory'),
        actions: [
          IconButton(
            key: const Key('share-memory-button'),
            onPressed: _printing || _sharing ? null : _shareCurrentSide,
            tooltip: 'Share Memory',
            icon: _sharing
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.ios_share_outlined),
          ),
          IconButton(
            key: const Key('print-memory-button'),
            onPressed: _printing || _sharing ? null : _openPrintMenu,
            tooltip: 'Print Memory',
            icon: _printing
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.print_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            Center(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: GrookaiObjectDestinationExportRenderer(
                  repaintBoundaryKey: _exportBoundaryKey,
                  object: object,
                  destination: _exportDestination,
                  showFront: _showFront,
                ),
              ),
            ),
            const SizedBox(height: 14),
            SegmentedButton<bool>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment<bool>(
                  value: false,
                  icon: Icon(Icons.menu_book_outlined),
                  label: Text('Memory'),
                ),
                ButtonSegment<bool>(
                  value: true,
                  icon: Icon(Icons.style_outlined),
                  label: Text('Card'),
                ),
              ],
              selected: {_showFront},
              onSelectionChanged: (selection) {
                setState(() => _showFront = selection.single);
              },
            ),
            const SizedBox(height: 18),
            Text(
              'Style',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            GrookaiObjectSkinPicker(
              selected: _skin,
              onChanged: (skin) => setState(() => _skin = skin),
            ),
            const SizedBox(height: 24),
            Text(
              _memoryTypeLabel(memory.memoryType),
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              item.cardName,
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            if (item.setName.trim().isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(
                item.setName.trim(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            if (note.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text(
                note,
                key: const Key('collector-memory-full-note'),
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(height: 1.45),
              ),
            ],
            if (details.isNotEmpty) ...[
              const SizedBox(height: 18),
              Wrap(
                spacing: 16,
                runSpacing: 10,
                children: [
                  for (final detail in details)
                    _MemoryDetail(icon: detail.icon, label: detail.label),
                ],
              ),
            ],
            if (canOpenCard) ...[
              const SizedBox(height: 24),
              OutlinedButton.icon(
                key: const Key('view-memory-card-button'),
                onPressed: _openCard,
                icon: const Icon(Icons.open_in_new_rounded),
                label: const Text('View card'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

enum _MemoryPrintAction { memoryInsert, frontAndBack, sharePdf }

class _MemoryPrintSheet extends StatelessWidget {
  const _MemoryPrintSheet();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Print Memory',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            ListTile(
              key: const Key('print-memory-insert-option'),
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.note_outlined),
              title: const Text('Memory insert'),
              subtitle: const Text('One card-size Memory side'),
              onTap: () =>
                  Navigator.of(context).pop(_MemoryPrintAction.memoryInsert),
            ),
            ListTile(
              key: const Key('print-memory-front-back-option'),
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.copy_all_outlined),
              title: const Text('Front and back'),
              subtitle: const Text('Two aligned card-size pages'),
              onTap: () =>
                  Navigator.of(context).pop(_MemoryPrintAction.frontAndBack),
            ),
            ListTile(
              key: const Key('share-memory-pdf-option'),
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.ios_share_outlined),
              title: const Text('Share PDF'),
              subtitle: const Text('Save or send the Memory insert'),
              onTap: () =>
                  Navigator.of(context).pop(_MemoryPrintAction.sharePdf),
            ),
          ],
        ),
      ),
    );
  }
}

class _MemoryDetail extends StatelessWidget {
  const _MemoryDetail({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 17,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 6),
        Text(label, style: Theme.of(context).textTheme.bodyMedium),
      ],
    );
  }
}

class _MemoryDetailValue {
  const _MemoryDetailValue(this.icon, this.label);

  final IconData icon;
  final String label;
}

List<_MemoryDetailValue> _memoryDetails(CollectorMemory memory) {
  return [
    if (memory.memoryDate != null)
      _MemoryDetailValue(
        Icons.calendar_month_outlined,
        _formatDate(memory.memoryDate!),
      ),
    if ((memory.placeLabel ?? '').trim().isNotEmpty)
      _MemoryDetailValue(Icons.location_on_outlined, memory.placeLabel!.trim()),
    if ((memory.occasionLabel ?? '').trim().isNotEmpty)
      _MemoryDetailValue(
        Icons.celebration_outlined,
        memory.occasionLabel!.trim(),
      ),
  ];
}

String _formatDate(DateTime date) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${months[date.month - 1]} ${date.day}, ${date.year}';
}

String _printFileName(String cardName) {
  final normalized = cardName
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  return 'grookai-memory-${normalized.isEmpty ? 'card' : normalized}.pdf';
}

String _memoryTypeLabel(CollectorMemoryType type) {
  return switch (type) {
    CollectorMemoryType.addedPlace => 'Added here',
    CollectorMemoryType.occasion => 'Occasion',
    CollectorMemoryType.first => 'First memory',
    CollectorMemoryType.note => 'Collector note',
  };
}
