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

Future<bool> showVaultCopySaleSheet(BuildContext context, String gvviId) async {
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
  var committed = false;
  return await showModalBottomSheet<bool>(
        context: context,
        showDragHandle: true,
        isScrollControlled: true,
        isDismissible: false,
        enableDrag: false,
        builder: (_) => VaultCopySaleSheet(
          onSaved: () => committed = true,
          cardName: data.cardName,
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
    this.pricingService,
    this.labelContent,
  });
  final String cardName;
  final SaleListingCopyContext copy;
  final SaleListingService? service;
  final VoidCallback? onSaved;
  final VendorPricingRulesService? pricingService;
  final P21LabelContent? labelContent;
  @override
  State<VaultCopySaleSheet> createState() => _VaultCopySaleSheetState();
}

class _VaultCopySaleSheetState extends State<VaultCopySaleSheet> {
  late final _price = TextEditingController(
    text: widget.copy.askingPriceAmount?.toStringAsFixed(2) ?? '',
  );
  final _focus = FocusNode();
  bool _busy = false, _saved = false, _committed = false;
  String? _error, _squareStatus;
  Map<String, dynamic>? _pricing, _quote;
  String _selection = 'manual';
  bool _quoting = false;
  bool _edited = false, _pricingCurrent = false, _pricingConflict = false;
  int _quoteGeneration = 0, _workspaceGeneration = 0;
  int? _editRevision;
  bool get _usesPricing =>
      widget.service == null || widget.pricingService != null;
  VendorPricingRulesService get _pricingService =>
      widget.pricingService ?? VendorPricingRulesService();
  @override
  void initState() {
    super.initState();
    // Existing injected listing tests do not acquire a global session.
    if (_usesPricing) _loadPricing();
  }

  Future<bool> _loadPricing() async {
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
        if (_editRevision == null || !_edited) {
          _editRevision = revision;
        } else if (_editRevision != revision) {
          _pricingConflict = true;
          _error =
              'This copy\'s pricing changed in another view. Close this sheet and reload the copy before saving your edits.';
        }
        if (!_edited) {
          _selection = c?['mode'] == 'preset'
              ? c!['rule_id'] as String
              : c?['mode'] == 'default'
              ? 'default'
              : 'manual';
        }
      });
      if (_selection != 'manual' && !_pricingConflict) await _preview();
      return true;
    } catch (_) {
      /* Manual sale flow remains available during staged rollout. */
      if (mounted && generation == _workspaceGeneration) {
        setState(() => _pricingCurrent = false);
      }
      return false;
    }
  }

  Future<void> _preview() async {
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
      _quote = null;
    });
    try {
      final q = await _pricingService
          .preview(widget.copy.instanceId, _selection)
          .timeout(const Duration(seconds: 12));
      if (mounted && generation == _quoteGeneration) setState(() => _quote = q);
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
    _price.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || _pricingConflict) return;
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
      }
      _edited = false;
      _pricingCurrent = false;
      final pricingRefreshed = !_usesPricing || await _loadPricing();
      if (mounted) {
        setState(() {
          _saved = true;
          _committed = true;
          _squareStatus = squareStatus;
          if (!pricingRefreshed) {
            _error =
                'Sale saved. Close this sheet and reload the copy before changing its pricing again.';
          }
        });
        widget.onSaved?.call();
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'The save could not be confirmed. Close this sheet and reload the copy before retrying.',
        );
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
                      'Sell this copy',
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
              Text(widget.cardName, style: theme.textTheme.titleMedium),
              Text(widget.copy.gvviId, style: theme.textTheme.bodySmall),
              const SizedBox(height: 12),
              const Text(
                'Saving makes this exact copy public and For sale. Square syncs it automatically when automatic stock is enabled for your account.',
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
                  onChanged: _busy
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
                  enabled: !_busy,
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
                  onSubmitted: (_) => _save(),
                ),
              if (_selection != 'manual')
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Semantics(
                    liveRegion: true,
                    child: Text(
                      _pricing?['enabled'] != true
                          ? 'Automatic repricing is paused. Your last confirmed asking price is retained.'
                          : _quoting
                          ? 'Checking fresh market…'
                          : _quote?['status'] == 'ready'
                          ? '\$${((_quote!['amountMinor'] as num) / 100).toStringAsFixed(2)} · ${_quote!['ruleName']}. Updates automatically.'
                          : _quote?['reason'] as String? ??
                                'Choose a pricing rule.',
                    ),
                  ),
                ),
              if (_selection != 'manual' && _error != null)
                Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
              const SizedBox(height: 16),
              FilledButton(
                onPressed:
                    _busy ||
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
              if (_saved) ...[
                const SizedBox(height: 16),
                Semantics(
                  liveRegion: true,
                  child: Text(switch (_squareStatus) {
                    'ready' => 'For sale saved. Ready to scan in Square.',
                    'pending' =>
                      'For sale saved. Square is still syncing. Wait for confirmation before checkout.',
                    'review' =>
                      'For sale saved. Square needs attention before checkout.',
                    _ =>
                      'For sale saved. Your profile and sharing settings still apply.',
                  }),
                ),
                if (_squareStatus == 'pending' || _squareStatus == 'review')
                  TextButton(
                    onPressed: () async {
                      _focus.unfocus();
                      await Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const SquareScreen(),
                        ),
                      );
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
                  OutlinedButton.icon(
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
