import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/grookai_sale_listing.dart';
import '../../services/grookai_objects/grookai_object_export_service.dart';
import '../../services/grookai_objects/sale_listing_service.dart';
import '../../services/vault/vault_gvvi_service.dart';
import '../../widgets/grookai_objects/grookai_object_flattened_renderer.dart';
import '../../widgets/grookai_objects/grookai_object.dart';
import '../../widgets/grookai_objects/grookai_object_skin.dart';
import '../../widgets/grookai_objects/grookai_object_skin_picker.dart';

typedef SaleListingCopyLoader =
    Future<SaleListingCopyContext?> Function(String gvviId);

class ForSaleTermsScreen extends StatefulWidget {
  ForSaleTermsScreen({
    super.key,
    required this.gvviId,
    required this.source,
    SaleListingService? service,
    GrookaiObjectExportService? exportService,
    SaleListingCopyLoader? copyLoader,
    this.initialCopy,
  }) : service = service ?? SaleListingService(),
       exportService = exportService ?? const GrookaiObjectExportService(),
       copyLoader = copyLoader ?? _defaultCopyLoader;

  final String gvviId;
  final GrookaiSaleListingSource source;
  final SaleListingService service;
  final GrookaiObjectExportService exportService;
  final SaleListingCopyLoader copyLoader;
  final SaleListingCopyContext? initialCopy;

  @override
  State<ForSaleTermsScreen> createState() => _ForSaleTermsScreenState();
}

class _ForSaleTermsScreenState extends State<ForSaleTermsScreen> {
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();
  final GlobalKey _exportBoundaryKey = GlobalKey();

  SaleListingCopyContext? _copy;
  GrookaiObjectSkin _skin = GrookaiObjectSkin.onyx;
  String _condition = 'Raw NM';
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
    final initial = widget.initialCopy;
    if (initial != null) {
      _applyCopy(initial);
      _loading = false;
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
      setState(() {
        _applyCopy(copy);
        _loading = false;
      });
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

  void _applyCopy(SaleListingCopyContext copy) {
    _copy = copy;
    _condition = copy.conditionLabel ?? 'Raw NM';
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
      setState(() => _error = 'Exact copy target could not be resolved.');
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
      if (!mounted) {
        return;
      }
      setState(() {
        _savedObject = GrookaiSaleListingAdapter.fromSavedListing(
          source: widget.source,
          skin: _skin,
          listing: saved,
          condition: _condition,
          quantity: 1,
          firm: _firm,
          allowDms: _allowDms,
        );
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Sale listing saved.')));
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

    setState(() {
      _sharing = true;
      _error = null;
    });

    try {
      final object = _previewObject;
      final bytes = await widget.exportService.capturePng(_exportBoundaryKey);
      await widget.exportService.sharePng(
        bytes: bytes,
        fileName: GrookaiObjectExportService.fileNameFor(
          type: 'sale',
          title: _exportTitle(object),
        ),
        subject: 'Grookai sale card',
        text: 'Shared from Grookai Vault',
      );
    } catch (error) {
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
      source: widget.source,
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
      appBar: AppBar(title: const Text('List for Sale')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
                children: [
                  Center(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: GrookaiObjectFlattenedRenderer(
                        repaintBoundaryKey: _exportBoundaryKey,
                        object: _previewObject,
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
                    items: const [
                      DropdownMenuItem(value: 'Raw NM', child: Text('Raw NM')),
                      DropdownMenuItem(value: 'Raw LP', child: Text('Raw LP')),
                      DropdownMenuItem(value: 'Raw MP', child: Text('Raw MP')),
                      DropdownMenuItem(value: 'PSA 10', child: Text('PSA 10')),
                      DropdownMenuItem(value: 'PSA 9', child: Text('PSA 9')),
                      DropdownMenuItem(value: 'CGC 10', child: Text('CGC 10')),
                    ],
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

class SaleListingCopyContext {
  const SaleListingCopyContext({
    required this.instanceId,
    required this.gvviId,
    required this.vaultItemId,
    required this.cardPrintId,
    this.conditionLabel,
    this.askingPriceAmount,
    this.askingPriceNote,
  });

  final String instanceId;
  final String gvviId;
  final String vaultItemId;
  final String cardPrintId;
  final String? conditionLabel;
  final double? askingPriceAmount;
  final String? askingPriceNote;
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
