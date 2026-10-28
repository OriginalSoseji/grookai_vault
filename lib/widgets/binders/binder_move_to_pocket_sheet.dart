import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../models/binders/binder_grid_layout.dart';
import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_display_identity.dart';
import '../cards/collector_card_context.dart';
import 'binder_widgets.dart';

class BinderMoveToPocketSheet extends StatefulWidget {
  const BinderMoveToPocketSheet({
    super.key,
    required this.slots,
    required this.from,
    required this.layout,
  });

  final List<BinderCustomSlotDraft> slots;
  final int from;
  final BinderGridLayout layout;

  @override
  State<BinderMoveToPocketSheet> createState() =>
      _BinderMoveToPocketSheetState();
}

class _BinderMoveToPocketSheetState extends State<BinderMoveToPocketSheet> {
  final _number = TextEditingController();
  final _focus = FocusNode();
  bool _attempted = false;
  bool _leaving = false;

  int? get _target {
    final text = _number.text.trim();
    final number = RegExp(r'^[0-9]+$').hasMatch(text)
        ? int.tryParse(text)
        : null;
    if (number == null || number < 1 || number > widget.slots.length) {
      return null;
    }
    return number - 1;
  }

  String? get _error {
    if (_target == null) {
      return 'Enter a pocket from 1 to ${widget.slots.length}.';
    }
    if (_target == widget.from) return 'Choose a different pocket.';
    return null;
  }

  bool _validate() {
    setState(() => _attempted = true);
    if (_error != null) {
      _focus.requestFocus();
      return false;
    }
    _focus.unfocus();
    return true;
  }

  void _submit() {
    if (_leaving || !_validate()) return;
    _leaving = true;
    Navigator.pop(context, _target);
  }

  @override
  void dispose() {
    _number.dispose();
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final source = widget.slots[widget.from];
    final sourceIdentity = resolveBinderCatalogCardIdentity(source.card);
    final target = _error == null ? _target : null;
    final destination = target == null ? null : widget.slots[target];
    final capacity = widget.layout.pockets;
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: keyboard),
      child: SafeArea(
        top: false,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: math.min(
              620,
              math.max(0, MediaQuery.sizeOf(context).height - keyboard) * .85,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 4, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Move to pocket',
                        style: theme.textTheme.titleMedium,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Close move to pocket',
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
                  key: const ValueKey('binder-move-pocket-scroll'),
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      CollectorCardContext(
                        name: sourceIdentity.displayName,
                        imageUrl:
                            (source.card.hostedImageUrl ?? '').trim().isNotEmpty
                            ? source.card.hostedImageUrl
                            : source.card.fallbackImageUrl,
                        contextLabel:
                            'From pocket ${widget.from + 1} · ${source.finish.label} · ${source.requiredQuantity} ${source.requiredQuantity == 1 ? 'copy' : 'copies'} required',
                      ),
                      TextField(
                        key: const ValueKey('binder-move-pocket-number'),
                        controller: _number,
                        focusNode: _focus,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        onChanged: (_) => setState(() {}),
                        // Keyboard Done previews the destination; only the
                        // explicit Move card button can change the draft.
                        onSubmitted: (_) => _validate(),
                        decoration: InputDecoration(
                          labelText: 'Destination pocket',
                          helperText: '1–${widget.slots.length}',
                          errorText: _attempted ? _error : null,
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (destination != null && target != null)
                        Semantics(
                          liveRegion: true,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'Destination: pocket ${target + 1}',
                                style: theme.textTheme.labelLarge?.copyWith(
                                  color: theme.colorScheme.primary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Page ${target ~/ capacity + 1} · row ${(target % capacity) ~/ widget.layout.columns + 1} · column ${target % widget.layout.columns + 1}',
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Currently in this pocket',
                                style: theme.textTheme.labelSmall,
                              ),
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: BinderArtwork(
                                  imageUrl: destination.card.hostedImageUrl,
                                  fallbackImageUrl:
                                      destination.card.fallbackImageUrl,
                                  semanticLabel:
                                      resolveBinderCatalogCardIdentity(
                                        destination.card,
                                      ).displayName,
                                  size: 44,
                                ),
                                title: Text(
                                  resolveBinderCatalogCardIdentity(
                                    destination.card,
                                  ).displayName,
                                ),
                                subtitle: Text(
                                  [
                                    if (destination.card.setLabel.isNotEmpty)
                                      destination.card.setLabel,
                                    if ((destination.card.number ?? '')
                                        .isNotEmpty)
                                      '#${destination.card.number}',
                                    '${destination.finish.label} · ×${destination.requiredQuantity}',
                                  ].join(' · '),
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Cards in between shift. No requirements are removed.',
                              ),
                            ],
                          ),
                        )
                      else
                        const Text('Enter a destination to preview the move.'),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton.icon(
                  key: const ValueKey('binder-move-pocket-confirm'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                  onPressed: _submit,
                  icon: const Icon(Icons.drive_file_move_outlined),
                  label: const Text('Move card'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
