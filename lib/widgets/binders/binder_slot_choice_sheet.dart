import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_display_identity.dart';
import 'binder_widgets.dart';

/// Edits only a checklist requirement. It does not add or change a Vault copy.
class BinderSlotChoiceSheet extends StatefulWidget {
  const BinderSlotChoiceSheet({
    super.key,
    required this.card,
    required this.finishes,
    this.existing,
  });

  final BinderCatalogCard card;
  final List<BinderFinishOption> finishes;
  final BinderCustomSlotDraft? existing;

  @override
  State<BinderSlotChoiceSheet> createState() => _BinderSlotChoiceSheetState();
}

class _BinderSlotChoiceSheetState extends State<BinderSlotChoiceSheet> {
  late BinderFinishOption? _finish = _initialFinish();

  BinderFinishOption? _initialFinish() {
    final wanted = widget.existing != null
        ? widget.existing!.finish.cardPrintingId
        : widget.card.preferredCardPrintingId;
    for (final option in widget.finishes) {
      if (option.cardPrintingId == wanted) return option;
    }
    // An existing exact requirement must never silently become "any finish".
    if (widget.existing != null || widget.finishes.isEmpty) return null;
    return widget.finishes.first;
  }

  late final _quantity = TextEditingController(
    text: '${widget.existing?.requiredQuantity ?? 1}',
  );
  String? _quantityError;

  @override
  void dispose() {
    _quantity.dispose();
    super.dispose();
  }

  void _submit() {
    final quantity = int.tryParse(_quantity.text.trim()) ?? 0;
    if (quantity < 1 || quantity > 100) {
      setState(() => _quantityError = 'Enter a quantity from 1 to 100.');
      return;
    }
    if (_finish == null) return;
    Navigator.pop(
      context,
      BinderCustomSlotDraft(
        card: widget.card,
        finish: _finish!,
        requiredQuantity: quantity,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final identity = resolveBinderCatalogCardIdentity(widget.card);
    final media = MediaQuery.of(context);
    return SafeArea(
      top: false,
      child: LayoutBuilder(
        builder: (context, constraints) => Padding(
          padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
          child: SizedBox(
            height: math.min(
              media.size.height * .86,
              math.max(0, constraints.maxHeight - media.viewInsets.bottom),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 4, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          widget.existing == null
                              ? 'Add checklist slot'
                              : 'Edit checklist slot',
                          style: theme.textTheme.titleMedium,
                        ),
                      ),
                      IconButton(
                        tooltip: 'Close slot choices',
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          BinderArtwork(
                            imageUrl: widget.card.hostedImageUrl,
                            fallbackImageUrl: widget.card.fallbackImageUrl,
                            size: 88,
                            semanticLabel: identity.displayName,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  identity.displayName,
                                  style: theme.textTheme.titleLarge,
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  [
                                    if (widget.card.setLabel.isNotEmpty)
                                      widget.card.setLabel,
                                    if ((widget.card.number ?? '').isNotEmpty)
                                      '#${widget.card.number}',
                                  ].join(' · '),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Finish requirement',
                        style: theme.textTheme.titleSmall,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Choose which finish can complete this slot.',
                        style: theme.textTheme.bodySmall,
                      ),
                      const SizedBox(height: 12),
                      if (widget.finishes.isEmpty)
                        const Text(
                          'Finish choices are unavailable. Close and try this card again.',
                        ),
                      for (final option in widget.finishes) ...[
                        Semantics(
                          selected: identical(_finish, option),
                          child: OutlinedButton(
                            key: ValueKey(
                              'custom-finish-${option.cardPrintingId ?? 'any'}',
                            ),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(64),
                              alignment: Alignment.centerLeft,
                              padding: const EdgeInsets.all(12),
                              side: BorderSide(
                                width: identical(_finish, option) ? 2 : 1,
                                color: identical(_finish, option)
                                    ? theme.colorScheme.primary
                                    : theme.colorScheme.outlineVariant,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            onPressed: () => setState(() => _finish = option),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(option.label),
                                      if (option.acceptsAnyGovernedFinish) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          'Accept any verified finish of this card.',
                                          style: theme.textTheme.bodySmall,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  identical(_finish, option)
                                      ? Icons.check_circle_rounded
                                      : Icons.radio_button_unchecked_rounded,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 9),
                      ],
                      const SizedBox(height: 15),
                      TextField(
                        key: const ValueKey('binder-slot-quantity'),
                        controller: _quantity,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _submit(),
                        onChanged: (_) {
                          if (_quantityError != null) {
                            setState(() => _quantityError = null);
                          }
                        },
                        decoration: InputDecoration(
                          labelText: 'Copies required',
                          helperText: '1–100 copies for this slot',
                          errorText: _quantityError,
                        ),
                      ),
                      if (_finish == null &&
                          widget.existing != null &&
                          widget.finishes.isNotEmpty)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 12),
                          child: Text(
                            'The previous finish is unavailable. Choose a listed requirement to continue.',
                          ),
                        ),
                      const SizedBox(height: 20),
                      FilledButton(
                        key: const ValueKey('binder-slot-confirm'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                        ),
                        onPressed: _finish == null ? null : _submit,
                        child: Text(
                          widget.existing == null ? 'Add slot' : 'Update slot',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
