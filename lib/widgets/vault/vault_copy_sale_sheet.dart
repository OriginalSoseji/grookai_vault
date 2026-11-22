import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/grookai_sale_listing.dart';
import '../../services/grookai_objects/sale_listing_service.dart';
import '../../services/gvvi/gvvi_vendor_offer_service.dart';
import '../../services/vault/vault_gvvi_service.dart';
import '../../screens/square/square_screen.dart';
import '../../screens/gvvi/vendor_pricing_rules_screen.dart';
import '../../services/gvvi/vendor_pricing_rules_service.dart';
import '../../services/printing/p21_label.dart';
import '../../screens/printing/identity_label_print_screen.dart';
import '../../services/identity/display_identity.dart';
import '../../services/public/public_card_printing_options_service.dart';
import '../card_surface_artwork.dart';
import 'sale_workflow_progress.dart';

Future<bool> showVaultCopySaleSheet(
  BuildContext context,
  String gvviId, {
  VoidCallback? onAddAnother,
}) async {
  final data = await VaultGvviService.loadPrivate(
    client: Supabase.instance.client,
    gvviId: gvviId,
  );
  if (!context.mounted) return false;
  if (data == null || data.isArchived) {
    throw StateError(
      'Reload this copy from your Vault before setting its sale price.',
    );
  }
  Future<String?> finishLabel() async {
    if (data.cardPrintingId == null) return 'Finish not recorded';
    try {
      final rows = await PublicCardPrintingOptionsService.fetch(
        client: Supabase.instance.client,
        cardPrintIds: [data.cardPrintId],
      ).timeout(const Duration(seconds: 12));
      final row = rows
          .where(
            (row) =>
                row['id'] == data.cardPrintingId &&
                row['card_print_id'] == data.cardPrintId,
          )
          .firstOrNull;
      return row == null
          ? 'Finish unavailable'
          : formatFinishLabel(
                  finishKey: row['finish_key'] as String?,
                  finishLabel: row['finish_label'] as String?,
                ) ??
                'Finish unavailable';
    } catch (_) {
      return 'Finish unavailable';
    }
  }

  final copyFinishLabel = finishLabel();
  var committed = false;
  return await showModalBottomSheet<bool>(
        context: context,
        showDragHandle: true,
        isScrollControlled: true,
        isDismissible: false,
        enableDrag: false,
        builder: (_) => VaultCopySaleSheet(
          onSaved: () => committed = true,
          onAddAnother: onAddAnother,
          cardName: data.cardName,
          setName: data.canonicalSetName,
          cardNumber: data.number,
          imageUrl: data.primaryImageUrl,
          fallbackImageUrl: data.fallbackImageUrl,
          printingLabelFuture: copyFinishLabel,
          gradeLabel: data.isGraded
              ? [
                  data.grader ?? 'Graded',
                  data.grade,
                ].whereType<String>().join(' ')
              : null,
          initiallyPrivate: data.intent == 'hold',
          labelContent: P21LabelContent(
            title: data.cardName,
            setName: data.canonicalSetName ?? '',
            number: data.number,
            qrUri: buildPersistentGvviQrUri(data.gvviId),
          ),
          copy: SaleListingCopyContext(
            instanceId: data.instanceId,
            gvviId: data.gvviId,
            vaultItemId: data.vaultItemId,
            cardPrintId: data.cardPrintId,
            conditionLabel: data.conditionLabel,
            askingPriceAmount: data.askingPriceCurrency == 'USD'
                ? data.askingPriceAmount
                : null,
            askingPriceNote: data.askingPriceNote,
          ),
        ),
      ) ??
      committed;
}

/// A short exact-copy sale editor; the existing owner writer and Square worker
/// retain all publication, allocation and reconciliation authority.
class VaultCopySaleSheet extends StatefulWidget {
  const VaultCopySaleSheet({
    super.key,
    required this.cardName,
    required this.copy,
    this.service,
    this.onSaved,
    this.onAddAnother,
    this.pricingService,
    this.labelContent,
    this.setName,
    this.cardNumber,
    this.imageUrl,
    this.fallbackImageUrl,
    this.printingLabelFuture,
    this.gradeLabel,
    this.initiallyPrivate = true,
  });
  final String cardName;
  final SaleListingCopyContext copy;
  final SaleListingService? service;
  final VoidCallback? onSaved;

  /// An enclosing intake flow owns navigation until its own sheet has closed.
  final VoidCallback? onAddAnother;
  final VendorPricingRulesService? pricingService;
  final P21LabelContent? labelContent;
  final String? setName, cardNumber, imageUrl, fallbackImageUrl;
  final Future<String?>? printingLabelFuture;
  final String? gradeLabel;
  final bool initiallyPrivate;
  @override
  State<VaultCopySaleSheet> createState() => _VaultCopySaleSheetState();
}

class _VaultCopySaleSheetState extends State<VaultCopySaleSheet>
    with WidgetsBindingObserver {
  late final _price = TextEditingController(
    text: widget.copy.askingPriceAmount?.toStringAsFixed(2) ?? '',
  );
  final _focus = FocusNode();
  bool _busy = false, _saved = false, _committed = false;
  bool _saveUncertain = false;
  String? _error, _squareStatus;
  double? _confirmedPrice;
  Map<String, dynamic>? _pricing, _quote;
  String _selection = 'manual';
  bool _quoting = false;
  bool _edited = false, _pricingCurrent = false, _pricingConflict = false;
  int _quoteGeneration = 0, _workspaceGeneration = 0;
  int? _editRevision;
  Timer? _refreshTimer;
  bool _polling = false;
  bool _appActive =
      WidgetsBinding.instance.lifecycleState == null ||
      WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;
  bool get _usesPricing =>
      widget.service == null || widget.pricingService != null;
  VendorPricingRulesService get _pricingService =>
      widget.pricingService ?? VendorPricingRulesService();
  @override
  void initState() {
    super.initState();
    // Existing injected listing tests do not acquire a global session.
    if (_usesPricing) {
      WidgetsBinding.instance.addObserver(this);
      _loadPricing();
      _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
        unawaited(_refreshPricing());
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _appActive = state == AppLifecycleState.resumed;
    if (_appActive && _usesPricing) unawaited(_refreshPricing());
  }

  Future<void> _refreshPricing() async {
    if (!mounted ||
        !_appActive ||
        _busy ||
        _quoting ||
        _polling ||
        _pricingConflict ||
        _selection == 'manual' ||
        !(ModalRoute.of(context)?.isCurrent ?? true)) {
      return;
    }
    _polling = true;
    try {
      await _loadPricing(preserveEditBaseline: true);
    } finally {
      _polling = false;
    }
  }

  Future<bool> _loadPricing({bool preserveEditBaseline = false}) async {
    final generation = ++_workspaceGeneration;
    try {
      final w = await _pricingService
          .workspace(widget.copy.instanceId)
          .timeout(const Duration(seconds: 12));
      if (!mounted || generation != _workspaceGeneration) return false;
      final c = w['copy'] as Map?;
      final revision = (c?['revision'] as int?) ?? 0;
      setState(() {
        _pricing = w;
        _pricingCurrent = true;
        if (_editRevision == null || (!_edited && !preserveEditBaseline)) {
          _editRevision = revision;
        } else if (_editRevision != revision) {
          _pricingConflict = true;
          _error =
              'This copy\'s pricing changed in another view. Close this sheet and reload the copy before saving your edits.';
        }
        if (!_edited && !preserveEditBaseline) {
          _selection = c?['mode'] == 'preset'
              ? c!['rule_id'] as String
              : c?['mode'] == 'default'
              ? 'default'
              : 'manual';
        }
      });
      if (_selection != 'manual' && !_pricingConflict) {
        await _preview(retainQuote: preserveEditBaseline);
      }
      return true;
    } catch (_) {
      /* Manual sale flow remains available during staged rollout. */
      if (mounted && generation == _workspaceGeneration) {
        setState(() {
          _pricingCurrent = false;
          if (preserveEditBaseline && _selection != 'manual') {
            _quote = {
              'status': 'waiting',
              'reason':
                  'Price refresh is unavailable. Your last confirmed price is retained. It will retry automatically.',
            };
          }
        });
      }
      return false;
    }
  }

  Future<void> _preview({bool retainQuote = false}) async {
    final generation = ++_quoteGeneration;
    if (_selection == 'manual') {
      setState(() {
        _quote = null;
        _quoting = false;
      });
      return;
    }
    setState(() {
      _quoting = true;
      if (!retainQuote) _quote = null;
    });
    try {
      final q = await _pricingService
          .preview(widget.copy.instanceId, _selection)
          .timeout(const Duration(seconds: 12));
      if (mounted && generation == _quoteGeneration) {
        setState(() {
          if (retainQuote &&
              q['status'] == 'ready' &&
              q['amountMinor'] != _quote?['amountMinor'] &&
              _squareStatus == 'ready') {
            _squareStatus = 'pending';
          }
          _quote = q;
        });
      }
    } catch (_) {
      if (mounted && generation == _quoteGeneration) {
        setState(
          () => _quote = {
            'status': 'waiting',
            'reason':
                'Price preview is unavailable. Choose My price or try later.',
          },
        );
      }
    } finally {
      if (mounted && generation == _quoteGeneration) {
        setState(() => _quoting = false);
      }
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _price.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || _pricingConflict || _saveUncertain) return;
    final raw = _price.text.trim();
    final price = double.tryParse(raw);
    if (_selection == 'manual' &&
        (!RegExp(r'^(?:0|[1-9]\d*)(?:\.\d{1,2})?$').hasMatch(raw) ||
            price == null ||
            !price.isFinite ||
            price <= 0)) {
      setState(
        () => _error =
            'Enter a USD price greater than 0, with up to 2 decimal places.',
      );
      _focus.requestFocus();
      return;
    }
    FocusScope.of(context).unfocus();
    // A response started before this write cannot replace its refreshed base.
    _workspaceGeneration++;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final copy = widget.copy;
      String squareStatus;
      double? confirmedPrice;
      if (_selection != 'manual') {
        squareStatus = await _pricingService.apply(
          instanceId: copy.instanceId,
          selection: _selection,
          revision: _editRevision ?? 0,
        );
      } else {
        final result = await (widget.service ?? SaleListingService())
            .saveSingleCardListing(
              instanceId: copy.instanceId,
              gvviId: copy.gvviId,
              vaultItemId: copy.vaultItemId,
              cardPrintId: copy.cardPrintId,
              price: price!,
              currency: 'USD',
              preserveNote: true,
              waitForSquareConfirmation: true,
            );
        squareStatus = result.squareStatus;
        confirmedPrice = result.price;
      }
      _edited = false;
      _pricingCurrent = false;
      final pricingRefreshed = !_usesPricing || await _loadPricing();
      if (_selection != 'manual' && pricingRefreshed) {
        confirmedPrice =
            ((_pricing?['copy'] as Map?)?['resolved_minor'] as num?)
                ?.toDouble();
        if (confirmedPrice != null) confirmedPrice /= 100;
      }
      if (mounted) {
        setState(() {
          _saved = true;
          _committed = true;
          _squareStatus = squareStatus;
          _confirmedPrice = confirmedPrice;
          if (!pricingRefreshed) {
            _error =
                'Sale saved. Close this sheet and reload the copy before changing its pricing again.';
          }
        });
        widget.onSaved?.call();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _saveUncertain = true;
          _error =
              'The save could not be confirmed. Close this sheet and reload the copy before retrying.';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PopScope(
      canPop: !_busy,
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            20,
            0,
            20,
            20 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _saved ? 'Saved for sale' : 'Review this copy',
                      style: theme.textTheme.titleLarge,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Close sale editor',
                    onPressed: _busy
                        ? null
                        : () => Navigator.pop(context, _committed),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              SaleWorkflowProgress(
                step: _busy
                    ? 1
                    : _saved
                    ? 2
                    : 0,
              ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (widget.imageUrl != null) ...[
                    CardSurfaceArtwork(
                      label: widget.cardName,
                      imageUrl: widget.imageUrl,
                      fallbackImageUrl: widget.fallbackImageUrl,
                      width: 64,
                      height: 92,
                      borderRadius: 10,
                      showShadow: false,
                      enableTapToZoom: false,
                    ),
                    const SizedBox(width: 14),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.cardName,
                          style: theme.textTheme.titleMedium,
                        ),
                        if (widget.printingLabelFuture != null)
                          FutureBuilder<String?>(
                            future: widget.printingLabelFuture,
                            builder: (_, snapshot) => Text(
                              snapshot.connectionState == ConnectionState.done
                                  ? snapshot.data ?? 'Finish unavailable'
                                  : 'Checking finish…',
                              style: theme.textTheme.bodySmall,
                            ),
                          ),
                        if (widget.setName?.trim().isNotEmpty == true)
                          Text(
                            [
                              widget.setName!,
                              if (widget.cardNumber?.isNotEmpty == true)
                                '#${widget.cardNumber}',
                            ].join(' · '),
                          ),
                        Text(
                          widget.gradeLabel ??
                              widget.copy.conditionLabel ??
                              'Condition not set',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(widget.copy.gvviId, style: theme.textTheme.bodySmall),
              if (!_saved) ...[
                const SizedBox(height: 12),
                const Text(
                  'Review your price, then publish this exact copy. Publishing makes it public and For sale.',
                ),
                const SizedBox(height: 16),
                if (_pricing != null) ...[
                  DropdownButtonFormField<String>(
                    key: ValueKey('copy-pricing-$_selection'),
                    initialValue: _selection,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Pricing'),
                    items: [
                      const DropdownMenuItem(
                        value: 'manual',
                        child: Text('My price · fixed'),
                      ),
                      DropdownMenuItem(
                        value: 'default',
                        enabled:
                            _pricingCurrent &&
                            _pricing!['enabled'] == true &&
                            (_pricing!['settings'] as Map)['default_rule_id'] !=
                                null,
                        child: const Text('Vendor default · automatic'),
                      ),
                      ...((_pricing!['rules'] as List?) ?? []).map(
                        (r) => DropdownMenuItem(
                          value: r['id'] as String,
                          enabled:
                              _pricingCurrent && _pricing!['enabled'] == true,
                          child: Text('${r['name']} · automatic'),
                        ),
                      ),
                    ],
                    onChanged: _busy || _saveUncertain
                        ? null
                        : (v) {
                            setState(() {
                              _edited = true;
                              _selection = v!;
                              _saved = false;
                              _squareStatus = null;
                              if (!_pricingConflict) _error = null;
                            });
                            _preview();
                          },
                  ),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () async {
                            await Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => VendorPricingRulesScreen(
                                  service: _pricingService,
                                ),
                              ),
                            );
                            if (mounted) await _loadPricing();
                          },
                    child: const Text('Manage pricing rules'),
                  ),
                ],
                if (_selection == 'manual')
                  TextField(
                    controller: _price,
                    focusNode: _focus,
                    enabled: !_busy && !_saveUncertain,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    textInputAction: TextInputAction.done,
                    decoration: InputDecoration(
                      labelText: 'Asking price · USD',
                      prefixText: r'$',
                      errorText: _error,
                      errorMaxLines: 4,
                    ),
                    onChanged: (_) => setState(() {
                      _edited = true;
                      _saved = false;
                      _squareStatus = null;
                      if (!_pricingConflict) _error = null;
                    }),
                    onSubmitted: (_) => _focus.unfocus(),
                  ),
                if (_selection != 'manual')
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Semantics(
                      liveRegion: true,
                      child: Text(
                        _pricing?['enabled'] != true
                            ? 'Automatic repricing is paused. Your last confirmed asking price is retained.'
                            : _quoting && _quote == null
                            ? 'Checking fresh market…'
                            : _quote?['status'] == 'ready'
                            ? '\$${((_quote!['amountMinor'] as num) / 100).toStringAsFixed(2)} · ${_quote!['ruleName']}. Updates automatically.'
                            : _quote?['reason'] as String? ??
                                  'Choose a pricing rule.',
                      ),
                    ),
                  ),
                if (_selection != 'manual' && _error != null)
                  Text(
                    _error!,
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed:
                      _busy ||
                          _saveUncertain ||
                          _pricingConflict ||
                          (_selection != 'manual' &&
                              (!_pricingCurrent ||
                                  _quoting ||
                                  _quote?['status'] != 'ready' ||
                                  _pricing?['enabled'] != true))
                      ? null
                      : _save,
                  child: Text(
                    _busy ? 'Saving and syncing…' : 'Make public and For sale',
                  ),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => Navigator.pop(context, _committed),
                  child: Text(
                    _saveUncertain
                        ? 'Close editor'
                        : !widget.initiallyPrivate || _committed
                        ? 'Cancel changes'
                        : 'Keep private',
                  ),
                ),
              ],
              if (_saved) ...[
                const SizedBox(height: 16),
                if (_confirmedPrice != null)
                  Text(
                    '\$${_confirmedPrice!.toStringAsFixed(2)}',
                    style: theme.textTheme.headlineMedium,
                  ),
                if (_error != null)
                  Text(
                    _error!,
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                Semantics(
                  liveRegion: true,
                  child: Text(switch (_squareStatus) {
                    'ready' => 'For sale saved. Ready to scan in Square.',
                    'pending' =>
                      'For sale saved. Square is still syncing. Wait for confirmation before checkout.',
                    'review' =>
                      'For sale saved. Square needs attention before checkout.',
                    'not_enabled' =>
                      'For sale saved. Automatic Square sales is not enabled.',
                    _ =>
                      'For sale saved. Your profile and sharing settings still apply.',
                  }),
                ),
                const SizedBox(height: 8),
                if (_selection != 'manual' && _quote?['status'] == 'ready')
                  Text(
                    'Current rule preview: \$${((_quote!['amountMinor'] as num) / 100).toStringAsFixed(2)}',
                    style: theme.textTheme.bodySmall,
                  ),
                Text(
                  _selection == 'manual'
                      ? 'My price · fixed'
                      : 'Automatic pricing · ${_quote?['ruleName'] ?? 'Saved rule'}',
                  style: theme.textTheme.bodySmall,
                ),
                if (_squareStatus == 'pending' ||
                    _squareStatus == 'review' ||
                    _squareStatus == 'not_enabled')
                  TextButton(
                    onPressed: () async {
                      _focus.unfocus();
                      await SquareScreen.open(context);
                      if (mounted) _focus.unfocus();
                    },
                    child: const Text('Check Square status'),
                  ),
                const SizedBox(height: 12),
                const Text('grookai QR', textAlign: TextAlign.center),
                Center(
                  child: Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(12),
                    child: QrImageView(
                      data: buildPersistentGvviQrUri(
                        widget.copy.gvviId,
                      ).toString(),
                      size: 200,
                      backgroundColor: Colors.white,
                      semanticsLabel: 'grookai QR for ${widget.cardName}',
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                if (widget.labelContent != null)
                  FilledButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => IdentityLabelPrintScreen(
                          labels: [widget.labelContent!],
                        ),
                      ),
                    ),
                    icon: const Icon(Icons.print_outlined),
                    label: const Text('Print label'),
                  ),
                TextButton(
                  onPressed:
                      _pricingConflict || !_pricingCurrent && _usesPricing
                      ? null
                      : () => setState(() => _saved = false),
                  child: const Text('Edit price'),
                ),
                OutlinedButton(
                  onPressed: () {
                    final navigator = Navigator.of(context);
                    widget.onAddAnother?.call();
                    navigator.pop(true);
                    if (widget.onAddAnother == null) {
                      unawaited(navigator.pushNamed('/search', arguments: ''));
                    }
                  },
                  child: const Text('Add another card'),
                ),
                OutlinedButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Done'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
