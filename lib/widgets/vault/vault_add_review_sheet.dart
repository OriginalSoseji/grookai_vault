import 'package:flutter/material.dart';
import '../cards/collector_card_context.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/intake/intake_controller.dart';
import '../../services/intake/intake_cost_allocation.dart';
import '../../services/intake/intake_draft_store.dart';
import '../../services/intake/intake_models.dart';
import '../../services/intake/intake_service.dart';
import '../../services/scanner_v5/scanner_v5_identity_service.dart';
import '../../services/public/jungle_edition_resolution_service.dart';
import 'vault_printing_picker.dart';
import '../../screens/vault/slab_upgrade_screen.dart';

Future<String?> showVaultAddReview({
  required BuildContext context,
  required String cardPrintId,
  required String gvId,
  required String name,
  required String setName,
  String? imageUrl,
  String? printingId,
  IntakeService? service,
}) async {
  final printing = await chooseVaultPrinting(
    context: context,
    client: Supabase.instance.client,
    cardPrintId: cardPrintId,
    cardName: name,
    preferredPrintingId: printingId,
  );
  if (printing == null || !context.mounted) return null;
  (await getJungleEditionResolution(
    Supabase.instance.client,
    cardPrintId,
  )).assertSelection(cardPrintId, printing.id);
  if (!context.mounted) return null;
  return showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (_) => VaultAddReviewSheet(
      service: service,
      cardPrintId: cardPrintId,
      gvId: gvId,
      name: name,
      setName: setName,
      printingId: printing.id,
      finish: printing.label,
      imageUrl: imageUrl,
    ),
  );
}

/// Manual and scanned additions share the same durable, idempotent intake commit.
class VaultAddReviewSheet extends StatefulWidget {
  const VaultAddReviewSheet({
    super.key,
    required this.cardPrintId,
    required this.gvId,
    required this.name,
    required this.setName,
    required this.printingId,
    required this.finish,
    this.imageUrl,
    this.service,
    this.initialAcquiredOn,
  });
  final String cardPrintId, gvId, name, setName, printingId, finish;
  final String? imageUrl;
  final IntakeService? service;
  final DateTime? initialAcquiredOn;
  @override
  State<VaultAddReviewSheet> createState() => _VaultAddReviewSheetState();
}

class _VaultAddReviewSheetState extends State<VaultAddReviewSheet> {
  final _quantity = TextEditingController(text: '1');
  final _cost = TextEditingController();
  late final _service =
      widget.service ?? IntakeService(Supabase.instance.client);
  late final Future<List<PurchaseLot>> _lots = _service.lots();
  PurchaseLot? _lot;
  String _condition = 'Unspecified';
  late DateTime _acquiredOn = widget.initialAcquiredOn ?? DateTime.now();
  bool _graded = false, _busy = false, _reviewed = false;
  String? _error;
  IntakeController? _controller;
  @override
  void dispose() {
    _quantity.dispose();
    _cost.dispose();
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_controller == null) {
        final quantity = int.tryParse(_quantity.text);
        if (quantity == null ||
            quantity < 1 ||
            quantity > 100 ||
            (_graded && quantity != 1)) {
          throw StateError('Choose 1–100 raw copies, or one slab.');
        }
        final cents = parseIntakeMoney(_cost.text);
        final item = IntakeItem(
          captureId: newIntakeId(),
          imagePath: '',
          state: 'confirmed',
          selected: ScannerV5Candidate(
            id: widget.gvId,
            cardId: widget.cardPrintId,
            gvId: widget.gvId,
            name: widget.name,
            imageUrl: widget.imageUrl,
          ),
          cardPrintingId: widget.printingId,
          finishLabel: widget.finish,
          quantity: quantity,
          condition: _condition,
          manualTotalCents: cents,
        );
        final allocation = allocateIntakeCosts(items: [item]);
        item.copyCostsCents = allocation.costs[item.id]!;
        item.allocation = {
          'method': cents == null ? 'unknown_cost_v1' : 'manual_row_total_v1',
          'quantity': quantity,
          'lot_revision': _lot?.revision,
        };
        final batch = IntakeBatch(
          title: '${widget.name} · manual add',
          userId: _service.userId,
          lotId: _lot?.id,
          currency: _lot?.currency ?? 'USD',
          acquiredOn: _acquiredOn,
          items: [item],
          allocationReviewed: true,
        );
        _controller = IntakeController(
          batch: batch,
          store: await IntakeDraftStore.open(_service.userId),
          service: _service,
        );
        await _controller!.persist();
      }
      await _controller!.saveToVault();
      final ids = _controller!.batch.items
          .expand((item) => item.savedInstanceIds)
          .toList();
      if (ids.isEmpty) {
        throw StateError(
          'No saved copies were returned. Your draft is retained.',
        );
      }
      final row = await Supabase.instance.client
          .from('vault_item_instances')
          .select('id,gv_vi_id')
          .eq('id', ids.first)
          .eq('user_id', _service.userId)
          .single();
      final gvvi = row['gv_vi_id']?.toString();
      if (gvvi == null || gvvi.isEmpty) {
        throw StateError(
          'Saved copy is awaiting its identity. Retry to reopen it.',
        );
      }
      if (!mounted) return;
      if (_graded) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => SlabUpgradeScreen(
              sourceInstanceId: ids.first,
              cardPrintId: widget.cardPrintId,
              gvId: widget.gvId,
              cardName: widget.name,
              setName: widget.setName,
              imageUrl: widget.imageUrl,
            ),
          ),
        );
      }
      if (mounted) Navigator.pop(context, gvvi);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().replaceFirst('Bad state: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locked = _busy || _controller != null;
    final theme = Theme.of(context);
    void quantityStep(int delta) => setState(() {
      _quantity.text = ((int.tryParse(_quantity.text) ?? 1) + delta)
          .clamp(1, 100)
          .toString();
      _reviewed = false;
    });
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          20,
          0,
          20,
          24 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Add to Vault',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Close add to Vault',
                  onPressed: _busy ? null : () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            CollectorCardContext(
              name: widget.name,
              contextLabel: '${widget.setName} · ${widget.finish}',
              imageUrl: widget.imageUrl,
            ),
            const Divider(height: 1),
            const SizedBox(height: 16),
            SegmentedButton<bool>(
              style: const ButtonStyle(
                shape: WidgetStatePropertyAll(
                  RoundedRectangleBorder(
                    borderRadius: BorderRadius.all(Radius.circular(8)),
                  ),
                ),
              ),
              segments: const [
                ButtonSegment(value: false, label: Text('Raw card')),
                ButtonSegment(value: true, label: Text('Graded slab')),
              ],
              selected: {_graded},
              onSelectionChanged: locked
                  ? null
                  : (value) => setState(() {
                      _graded = value.first;
                      _reviewed = false;
                      if (_graded) _quantity.text = '1';
                    }),
            ),
            if (_graded)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  'Save one copy, then verify its slab certification. Until verification finishes, it remains a raw copy.',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            const SizedBox(height: 20),
            Text('Condition', style: theme.textTheme.labelLarge),
            const SizedBox(height: 10),
            Wrap(
              spacing: 5,
              runSpacing: 5,
              children: [
                for (final condition in const [
                  'Unspecified',
                  'NM',
                  'LP',
                  'MP',
                  'HP',
                  'DMG',
                ])
                  SizedBox(
                    height: 44,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        minimumSize: const Size(40, 44),
                        foregroundColor: _condition == condition
                            ? theme.colorScheme.primary
                            : theme.colorScheme.onSurfaceVariant,
                        side: BorderSide(
                          color: _condition == condition
                              ? theme.colorScheme.primary
                              : theme.colorScheme.outlineVariant,
                        ),
                        backgroundColor: _condition == condition
                            ? theme.colorScheme.primary.withValues(alpha: .07)
                            : null,
                      ),
                      onPressed: locked
                          ? null
                          : () => setState(() {
                              _condition = condition;
                              _reviewed = false;
                            }),
                      child: Text(
                        condition == 'Unspecified' ? 'Unknown' : condition,
                        style: theme.textTheme.labelSmall,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                children: [
                  const Expanded(child: Text('Quantity')),
                  IconButton(
                    tooltip: 'Remove one copy',
                    onPressed: locked || _graded || _quantity.text == '1'
                        ? null
                        : () => quantityStep(-1),
                    icon: const Icon(Icons.remove, size: 20),
                  ),
                  SizedBox(
                    width: 48,
                    child: TextField(
                      controller: _quantity,
                      enabled: !locked && !_graded,
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        contentPadding: EdgeInsets.symmetric(vertical: 12),
                        isDense: true,
                      ),
                      onChanged: (_) => setState(() => _reviewed = false),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Add one copy',
                    onPressed: locked || _graded || _quantity.text == '100'
                        ? null
                        : () => quantityStep(1),
                    icon: const Icon(Icons.add, size: 20),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            OutlinedButton.icon(
              onPressed: locked
                  ? null
                  : () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: _acquiredOn,
                        firstDate: DateTime(1900),
                        lastDate: DateTime(2100),
                      );
                      if (date != null && mounted) {
                        setState(() {
                          _acquiredOn = date;
                          _reviewed = false;
                        });
                      }
                    },
              icon: const Icon(Icons.calendar_today_outlined, size: 18),
              label: Text('Acquired ${intakeDate(_acquiredOn)}'),
            ),
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              childrenPadding: const EdgeInsets.only(bottom: 12),
              shape: const Border(),
              collapsedShape: const Border(),
              title: const Text(
                'Acquisition cost',
                style: TextStyle(fontSize: 14),
              ),
              subtitle: Text(
                _cost.text.isEmpty
                    ? 'Not recorded · optional'
                    : '${_cost.text} ${_lot?.currency ?? 'USD'} total',
                style: theme.textTheme.bodySmall,
              ),
              children: [
                TextField(
                  controller: _cost,
                  enabled: !locked,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText:
                        'Total paid · ${_lot?.currency ?? 'USD'} (optional)',
                    helperText: 'Leave blank for unknown. Enter 0 for free.',
                    helperMaxLines: 3,
                  ),
                  onChanged: (_) => setState(() => _reviewed = false),
                ),
              ],
            ),
            const Divider(height: 1),
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              shape: const Border(),
              collapsedShape: const Border(),
              title: const Text('Purchase lot', style: TextStyle(fontSize: 14)),
              subtitle: Text(
                _lot?.name ?? 'None',
                style: theme.textTheme.bodySmall,
              ),
              childrenPadding: const EdgeInsets.only(bottom: 12),
              children: [
                FutureBuilder<List<PurchaseLot>>(
                  future: _lots,
                  builder: (_, snapshot) =>
                      DropdownButtonFormField<PurchaseLot>(
                        isExpanded: true,
                        initialValue: _lot,
                        decoration: InputDecoration(
                          labelText: 'Purchase destination',
                          helperMaxLines: 3,
                          helperText: snapshot.hasError
                              ? 'Lots unavailable. You can add without one.'
                              : null,
                        ),
                        items: [
                          const DropdownMenuItem<PurchaseLot>(
                            value: null,
                            child: Text('Vault · no purchase lot'),
                          ),
                          ...?snapshot.data?.map(
                            (lot) => DropdownMenuItem(
                              value: lot,
                              child: Text('${lot.name} · ${lot.currency}'),
                            ),
                          ),
                        ],
                        onChanged: locked
                            ? null
                            : (value) => setState(() {
                                _lot = value;
                                if (value != null) {
                                  _acquiredOn = value.purchasedOn;
                                }
                                _reviewed = false;
                              }),
                      ),
                ),
              ],
            ),
            const Divider(height: 1),
            const SizedBox(height: 8),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text(
                'I reviewed the printing, copies and cost',
                style: TextStyle(fontSize: 13),
              ),
              value: _reviewed,
              onChanged: locked
                  ? null
                  : (value) => setState(() => _reviewed = value!),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  _error!,
                  style: TextStyle(color: theme.colorScheme.error),
                ),
              ),
            FilledButton(
              onPressed: _busy || !_reviewed ? null : _save,
              child: Text(
                _busy
                    ? 'Saving copies…'
                    : _controller != null
                    ? 'Retry saved draft'
                    : 'Add ${_quantity.text} ${_quantity.text == '1' ? 'copy' : 'copies'}',
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                _controller != null
                    ? 'Draft retained in Batch intake. Retrying uses the same request.'
                    : 'Each physical copy is saved separately in your private vault.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
