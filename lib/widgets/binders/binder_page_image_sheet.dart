import 'dart:async';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../../models/binders/binder_grid_layout.dart';
import '../../models/binders/binder_models.dart';
import '../../services/grookai_objects/grookai_object_export_service.dart';
import 'binder_page_image.dart';

class BinderPageImageSheet extends StatefulWidget {
  const BinderPageImageSheet({
    super.key,
    required this.slots,
    required this.layout,
    required this.page,
    required this.totalPages,
    required this.isCurrent,
    this.exportService = const GrookaiObjectExportService(),
  });

  final List<BinderCustomSlotDraft> slots;
  final BinderGridLayout layout;
  final int page;
  final int totalPages;
  final bool Function() isCurrent;
  final GrookaiObjectExportService exportService;

  @override
  State<BinderPageImageSheet> createState() => _BinderPageImageSheetState();
}

class _BinderPageImageSheetState extends State<BinderPageImageSheet> {
  final _boundary = GlobalKey();
  bool _loading = true;
  bool _readingArtwork = false;
  bool _sharing = false;
  bool _stale = false;
  String? _error;
  List<String?> _artwork = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(_loadArtwork());
    });
  }

  Future<bool> _preload(String url) async {
    if (!mounted) return false;
    final stream = NetworkImage(
      url,
    ).resolve(createLocalImageConfiguration(context));
    final ready = Completer<bool>();
    final listener = ImageStreamListener(
      (image, _) {
        image.dispose();
        if (!ready.isCompleted) ready.complete(true);
      },
      onError: (_, _) {
        if (!ready.isCompleted) ready.complete(false);
      },
    );
    stream.addListener(listener);
    try {
      return await ready.future.timeout(
        const Duration(seconds: 8),
        onTimeout: () => false,
      );
    } finally {
      stream.removeListener(listener);
    }
  }

  Future<String?> _resolveArtwork(BinderCustomSlotDraft slot) async {
    final urls = {
      slot.card.hostedImageUrl?.trim(),
      slot.card.fallbackImageUrl?.trim(),
    };
    for (final url in urls) {
      if (!mounted) return null;
      if (url != null && url.isNotEmpty && await _preload(url)) return url;
    }
    return null;
  }

  Future<void> _loadArtwork() async {
    if (!mounted || _readingArtwork) return;
    _readingArtwork = true;
    setState(() {
      _loading = true;
      _error = null;
    });
    final urls = await Future.wait(widget.slots.map(_resolveArtwork));
    _readingArtwork = false;
    if (!mounted) return;
    setState(() {
      _artwork = urls;
      _loading = false;
    });
  }

  bool _checkCurrent() {
    if (widget.isCurrent()) return true;
    setState(() {
      _stale = true;
      _error =
          'The checklist or grid changed. Close this preview and open it again.';
    });
    return false;
  }

  Future<void> _share(BuildContext buttonContext) async {
    if (_sharing || _loading || _stale || !_checkCurrent()) return;
    final origin = GrookaiObjectExportService.sharePositionOriginFor(
      buttonContext,
    );
    setState(() {
      _sharing = true;
      _error = null;
    });
    var prepared = false;
    try {
      final bytes = await widget.exportService.capturePng(
        _boundary,
        pixelRatio: 2,
      );
      if (!mounted || !_checkCurrent()) return;
      prepared = true;
      final result = await widget.exportService.sharePng(
        bytes: bytes,
        fileName:
            'grookai-binder-page-${widget.page + 1}-${widget.layout.storageKey}.png',
        subject: 'grookai vault · Binder checklist · Page ${widget.page + 1}',
        sharePositionOrigin: origin,
      );
      if (mounted && result.status == ShareResultStatus.unavailable) {
        setState(() => _error = 'Sharing is unavailable on this device.');
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = prepared
              ? 'Could not open sharing. Try again.'
              : 'Could not prepare the page image. Try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final missing = _artwork.where((url) => url == null).length;
    return SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 4, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Share page image',
                    style: theme.textTheme.titleMedium,
                  ),
                ),
                IconButton(
                  tooltip: 'Close page image',
                  constraints: const BoxConstraints(
                    minWidth: 48,
                    minHeight: 48,
                  ),
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              key: const ValueKey('binder-page-image-scroll'),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Page ${widget.page + 1} of ${widget.totalPages} · ${widget.layout.label}',
                    style: theme.textTheme.labelLarge,
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Includes card goals, required finishes and quantities. Ownership and member information are not included.',
                  ),
                  const SizedBox(height: 16),
                  if (_loading)
                    const SizedBox(
                      height: 240,
                      child: Center(child: Text('Preparing page artwork…')),
                    )
                  else ...[
                    if (missing > 0) ...[
                      Semantics(
                        liveRegion: true,
                        child: Text(
                          '$missing artwork ${missing == 1 ? 'image is' : 'images are'} unavailable. Placeholders will be included.',
                        ),
                      ),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          onPressed: _sharing ? null : _loadArtwork,
                          icon: const Icon(Icons.refresh_rounded),
                          label: const Text('Retry artwork'),
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    Semantics(
                      label: 'Checklist page image preview',
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.topCenter,
                        child: SizedBox(
                          width: BinderPageImage.width,
                          child: RepaintBoundary(
                            key: _boundary,
                            child: BinderPageImage(
                              slots: widget.slots,
                              artworkUrls: _artwork,
                              layout: widget.layout,
                              page: widget.page,
                              totalPages: widget.totalPages,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        _error!,
                        style: TextStyle(color: theme.colorScheme.error),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Builder(
              builder: (buttonContext) => FilledButton.icon(
                key: const ValueKey('binder-share-image-confirm'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: _loading || _sharing || _stale
                    ? null
                    : () => _share(buttonContext),
                icon: const Icon(Icons.ios_share_rounded),
                label: Text(_sharing ? 'Preparing image…' : 'Share image'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
