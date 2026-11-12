import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/grookai_sale_listing.dart';
import '../../services/grookai_objects/sale_listing_service.dart';
import '../../services/gvvi/gvvi_vendor_offer_service.dart';
import '../../services/vault/vault_gvvi_service.dart';
import '../../screens/square/square_screen.dart';

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
  });
  final String cardName;
  final SaleListingCopyContext copy;
  final SaleListingService? service;
  final VoidCallback? onSaved;
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
  @override
  void dispose() {
    _price.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy) return;
    final raw = _price.text.trim();
    final price = double.tryParse(raw);
    if (!RegExp(r'^(?:0|[1-9]\d*)(?:\.\d{1,2})?$').hasMatch(raw) ||
        price == null ||
        !price.isFinite ||
        price <= 0) {
      setState(
        () => _error =
            'Enter a USD price greater than 0, with up to 2 decimal places.',
      );
      _focus.requestFocus();
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final copy = widget.copy;
      final result = await (widget.service ?? SaleListingService())
          .saveSingleCardListing(
            instanceId: copy.instanceId,
            gvviId: copy.gvviId,
            vaultItemId: copy.vaultItemId,
            cardPrintId: copy.cardPrintId,
            price: price,
            currency: 'USD',
            preserveNote: true,
          );
      if (mounted) {
        setState(() {
          _saved = true;
          _committed = true;
          _squareStatus = result.squareStatus;
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
                  _saved = false;
                  _squareStatus = null;
                  _error = null;
                }),
                onSubmitted: (_) => _save(),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _busy ? null : _save,
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
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const SquareScreen(),
                      ),
                    ),
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
