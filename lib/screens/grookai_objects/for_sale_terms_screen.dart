import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/grookai_sale_listing.dart';
import '../../services/diagnostics/grookai_crash_reporting_service.dart';
import '../../services/grookai_objects/grookai_object_export_service.dart';
import '../../services/grookai_objects/sale_card_handoff_store.dart';
import '../../services/grookai_objects/sale_listing_service.dart';
import '../../services/vault/vault_gvvi_service.dart';
import '../../widgets/grookai_objects/grookai_object.dart';
import '../../widgets/grookai_objects/grookai_object_destination_export_renderer.dart';
import '../../widgets/grookai_objects/grookai_object_share_destination_sheet.dart';
import '../../widgets/grookai_objects/grookai_object_skin.dart';
import '../../widgets/grookai_objects/grookai_object_skin_picker.dart';
import '../../widgets/pricing/ebay_seller_button.dart';

typedef SaleListingCopyLoader =
    Future<SaleListingCopyContext?> Function(String gvviId);

class ForSaleTermsScreen extends StatefulWidget {
  ForSaleTermsScreen({
    super.key,
    required this.gvviId,
    required this.source,
    SaleListingService? service,
    GrookaiObjectExportService? exportService,
    SaleCardHandoffStore? handoffStore,
    SaleListingCopyLoader? copyLoader,
    this.initialCopy,
    this.initialDraft,
  }) : service = service ?? SaleListingService(),
       exportService = exportService ?? const GrookaiObjectExportService(),
       handoffStore = handoffStore ?? SaleCardHandoffStore(),
       copyLoader = copyLoader ?? _defaultCopyLoader;

  final String gvviId;
  final GrookaiSaleListingSource source;
  final SaleListingService service;
  final GrookaiObjectExportService exportService;
  final SaleCardHandoffStore handoffStore;
  final SaleListingCopyLoader copyLoader;
  final SaleListingCopyContext? initialCopy;
  final SaleCardHandoff? initialDraft;

  @override
  State<ForSaleTermsScreen> createState() => _ForSaleTermsScreenState();
}

class _ForSaleTermsScreenState extends State<ForSaleTermsScreen> {
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();
  final GlobalKey _exportBoundaryKey = GlobalKey();

  SaleListingCopyContext? _copy;
  late GrookaiSaleListingSource _source;
  GrookaiObjectSkin _skin = GrookaiObjectSkin.onyx;
  GrookaiObjectExportDestination _exportDestination =
      GrookaiObjectExportDestination.saveImage;
  String _condition = _saleConditionOptions.first;
  bool _firm = true;
  bool _allowDms = true;
  bool _showFront = true;
  bool _loading = true;
  bool _saving = false;
  bool _sharing = false;
  String? _error;
  GrookaiObject? _savedObject;

  @override
  void initState() {
    super.initState();
    _source = widget.source;
    final initial = widget.initialCopy;
    if (initial != null) {
      _copy = initial;
      unawaited(_initializeForCopy(initial));
    } else {
      _loadCopy();
    }
  }

  @override
  void dispose() {
    _priceController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadCopy() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final copy = await widget.copyLoader(widget.gvviId);
      if (!mounted) {
        return;
      }
      if (copy == null) {
        setState(() {
          _loading = false;
          _error = 'Open your exact copy to list it for sale.';
        });
        return;
      }
      await _initializeForCopy(copy);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _initializeForCopy(SaleListingCopyContext copy) async {
    SaleCardHandoff? draft = widget.initialDraft;
    if (draft != null &&
        _source.cardImageUrl == null &&
        _source.cardImageFallbackUrl == null) {
      try {
        final ownerId = _currentOwnerId;
        if (ownerId != null) {
          final resolved = await VaultGvviService.loadPrivate(
            client: Supabase.instance.client,
            gvviId: copy.gvviId,
          );
          if (resolved?.instanceId == copy.instanceId &&
              resolved?.cardPrintId == copy.cardPrintId) {
            _source = GrookaiSaleListingSource(
              cardName: _source.cardName,
              setLine: _source.setLine,
              printingIdentityLabel: _source.printingIdentityLabel,
              cardImageUrl: resolved!.imageUrl,
              cardImageFallbackUrl:
                  resolved.representativeImageUrl ?? resolved.canonicalImageUrl,
              sellerHandle: _source.sellerHandle,
              sellerRating: _source.sellerRating,
              sellerTradeCount: _source.sellerTradeCount,
            );
          }
        }
      } catch (_) {
        // Artwork is optional; preserve the saved editor if Vault is offline.
      }
    }
    if (!mounted) return;
    setState(() {
      _applyCopy(copy);
      if (draft != null && draft.copy.instanceId == copy.instanceId) {
        _applyHandoff(draft);
      }
      _loading = false;
    });
  }

  void _applyHandoff(SaleCardHandoff draft) {
    _skin = draft.skin;
    _condition = _saleConditionOptions.contains(draft.condition)
        ? draft.condition
        : _condition;
    _priceController.text = draft.priceText;
    _noteController.text = draft.note;
    _firm = draft.firm;
    _allowDms = draft.allowDms;
    _showFront = draft.showFront;
    _exportDestination = draft.destination;
    _savedObject = null;
  }

  String? get _currentOwnerId {
    try {
      return widget.service.currentUserIdOrNull;
    } catch (_) {
      return null;
    }
  }

  Future<void> _saveHandoffForEbay() async {
    final copy = _copy;
    final ownerId = _currentOwnerId;
    if (copy == null || ownerId == null) return;
    await widget.handoffStore.save(
      SaleCardHandoff(
        ownerId: ownerId,
        copy: copy,
        source: _source,
        skin: _skin,
        condition: _condition,
        priceText: _priceController.text,
        note: _noteController.text,
        firm: _firm,
        allowDms: _allowDms,
        showFront: _showFront,
        destination: _exportDestination,
        savedAtMillis: DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }

  void _applyCopy(SaleListingCopyContext copy) {
    _copy = copy;
    _condition = normalizeSaleConditionLabel(copy.conditionLabel);
    if (copy.askingPriceAmount != null) {
      _priceController.text = copy.askingPriceAmount!.toStringAsFixed(2);
    }
    _noteController.text = copy.askingPriceNote ?? '';
  }

  Future<void> _saveListing() async {
    if (_saving) {
      return;
    }
    final copy = _copy;
    if (copy == null) {
      setState(() => _error = 'This card copy is not available yet.');
      return;
    }
    final price = double.tryParse(_priceController.text.trim());
    if (price == null || !price.isFinite || price <= 0) {
      setState(() => _error = 'Enter an asking price greater than 0.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final saved = await widget.service.saveSingleCardListing(
        instanceId: copy.instanceId,
        gvviId: copy.gvviId,
        vaultItemId: copy.vaultItemId,
        cardPrintId: copy.cardPrintId,
        price: price,
        currency: 'USD',
        note: _blankToNull(_noteController.text),
      );
      final ownerId = _currentOwnerId;
      if (ownerId != null) {
        try {
          await widget.handoffStore.clear(ownerId);
        } catch (_) {
          // Local recovery cleanup must not turn a confirmed Vault save into
          // an apparent failure.
        }
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _savedObject = GrookaiSaleListingAdapter.fromSavedListing(
          source: _source,
          skin: _skin,
          listing: saved,
          condition: _condition,
          quantity: 1,
          firm: _firm,
          allowDms: _allowDms,
        );
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(switch (saved.squareStatus) {
            'ready' => 'Sale listing saved. Ready to scan in Square.',
            'pending' =>
              'Sale listing saved. Square sync is pending; check Account → Square before selling.',
            'review' =>
              'Sale listing saved. Check Account → Square for an item that needs review.',
            _ => 'Sale listing saved.',
          }),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _shareCurrentCard() async {
    if (_sharing || _savedObject == null) {
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

    try {
      final object = _previewObject;
      final bytes = await widget.exportService.exportObjectPng(
        object: object,
        destination: destination,
        repaintBoundaryKey: _exportBoundaryKey,
      );
      await widget.exportService.sharePng(
        bytes: bytes,
        fileName: GrookaiObjectExportService.fileNameFor(
          type: 'sale-${destination.slug}',
          title: _exportTitle(object),
        ),
        subject: 'grookai sale card',
        text: 'Shared from grookai vault',
        sharePositionOrigin: sharePositionOrigin,
      );
    } catch (error, stackTrace) {
      GrookaiCrashReportingService.recordNonFatalError(
        error,
        stackTrace,
        reason: 'grookai_object_share_failed',
        context: <String, Object?>{
          'operation': 'share_png',
          'stage': 'for_sale_terms',
          'surface': 'for_sale',
          'object_type': 'sale',
          'destination': _exportDestination.slug,
        },
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _error = 'Unable to share this card right now.';
      });
    } finally {
      if (mounted) {
        setState(() => _sharing = false);
      }
    }
  }

  GrookaiObject get _previewObject {
    final saved = _savedObject;
    if (saved != null) {
      return saved.copyWith(skin: _skin);
    }
    final price = double.tryParse(_priceController.text.trim()) ?? 0;
    return GrookaiSaleListingAdapter.fromTerms(
      source: _source,
      skin: _skin,
      price: price,
      condition: _condition,
      quantity: 1,
      firm: _firm,
      allowDms: _allowDms,
      metadata: <String, dynamic>{
        if (_copy != null) ...{
          'gvvi_id': _copy!.gvviId,
          'vault_item_instance_id': _copy!.instanceId,
          'vault_item_id': _copy!.vaultItemId,
          'card_print_id': _copy!.cardPrintId,
        },
        'allow_dms': _allowDms,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Create sale card')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
                children: [
                  if (_copy != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: colorScheme.outlineVariant),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.info_outline_rounded,
                                size: 20,
                                color: colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Create a shareable grookai sale card for this exact copy. For a marketplace offer, open the eBay listing workflow below.',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    height: 1.45,
                                    color: colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          EbaySellerButton(
                            instanceId: _copy!.instanceId,
                            beforeOpen: _saveHandoffForEbay,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  Center(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: GrookaiObjectDestinationExportRenderer(
                        repaintBoundaryKey: _exportBoundaryKey,
                        object: _previewObject,
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
                    controller: _priceController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Asking price',
                      prefixText: r'$',
                    ),
                    onChanged: (_) => setState(() => _savedObject = null),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _condition,
                    decoration: const InputDecoration(labelText: 'Condition'),
                    items: _saleConditionOptions
                        .map(
                          (condition) => DropdownMenuItem<String>(
                            value: condition,
                            child: Text(condition),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value == null) {
                        return;
                      }
                      setState(() {
                        _condition = value;
                        _savedObject = null;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    value: _firm,
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Firm price'),
                    onChanged: (value) => setState(() {
                      _firm = value;
                      _savedObject = null;
                    }),
                  ),
                  SwitchListTile(
                    value: _allowDms,
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Allow buyer messages'),
                    onChanged: (value) => setState(() {
                      _allowDms = value;
                      _savedObject = null;
                    }),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _noteController,
                    minLines: 2,
                    maxLines: 4,
                    textInputAction: TextInputAction.newline,
                    decoration: const InputDecoration(
                      labelText: 'Listing note',
                      hintText: 'Shipping, bundles, or local pickup details',
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      _error!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.error,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    onPressed: _saving ? null : _saveListing,
                    icon: _saving
                        ? const SizedBox.square(
                            dimension: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.sell_outlined),
                    label: Text(_saving ? 'Saving...' : 'Save sale card'),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _savedObject == null || _sharing
                        ? null
                        : _shareCurrentCard,
                    icon: _sharing
                        ? const SizedBox.square(
                            dimension: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.ios_share_outlined),
                    label: Text(_sharing ? 'Sharing...' : 'Share image'),
                  ),
                ],
              ),
      ),
    );
  }
}

Future<SaleListingCopyContext?> _defaultCopyLoader(String gvviId) async {
  final data = await VaultGvviService.loadPrivate(
    client: Supabase.instance.client,
    gvviId: gvviId,
  );
  if (data == null || data.isArchived) {
    return null;
  }
  return SaleListingCopyContext(
    instanceId: data.instanceId,
    gvviId: data.gvviId,
    vaultItemId: data.vaultItemId,
    cardPrintId: data.cardPrintId,
    conditionLabel: data.conditionLabel,
    askingPriceAmount: data.askingPriceAmount,
    askingPriceNote: data.askingPriceNote,
  );
}

String? _blankToNull(String? value) {
  final normalized = (value ?? '').trim();
  return normalized.isEmpty ? null : normalized;
}

const List<String> _saleConditionOptions = [
  'Raw NM',
  'Raw LP',
  'Raw MP',
  'PSA 10',
  'PSA 9',
  'CGC 10',
];

String normalizeSaleConditionLabel(String? value) {
  final normalized = (value ?? '').trim();
  if (normalized.isEmpty) {
    return _saleConditionOptions.first;
  }

  final upper = normalized.toUpperCase();
  final rawMatch = RegExp(
    r'^RAW\s+(.+)$',
    caseSensitive: false,
  ).firstMatch(normalized);
  final rawGrade = rawMatch?.group(1)?.trim().toUpperCase() ?? upper;
  final rawMap = <String, String>{
    'NM': 'Raw NM',
    'NEAR MINT': 'Raw NM',
    'LP': 'Raw LP',
    'LIGHT PLAY': 'Raw LP',
    'MP': 'Raw MP',
    'MODERATE PLAY': 'Raw MP',
  };
  final mappedRaw = rawMap[rawGrade];
  if (mappedRaw != null) {
    return mappedRaw;
  }

  for (final option in _saleConditionOptions) {
    if (option.toUpperCase() == upper) {
      return option;
    }
  }

  return _saleConditionOptions.first;
}

String _exportTitle(GrookaiObject object) {
  final fields = object.fields;
  final cardName = fields['cardName'] ?? fields['card_name'];
  if (cardName is String && cardName.trim().isNotEmpty) {
    return cardName;
  }
  final title = fields['title'];
  if (title is String && title.trim().isNotEmpty) {
    return title;
  }
  return object.type;
}
