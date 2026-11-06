import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../models/binders/binder_grid_layout.dart';
import '../../models/binders/binder_models.dart';
import 'binder_widgets.dart';

class BinderPagePickerSheet extends StatefulWidget {
  const BinderPagePickerSheet({
    super.key,
    required this.slots,
    required this.layout,
    required this.currentPage,
    this.movingCard = false,
  });

  final List<BinderCustomSlotDraft> slots;
  final BinderGridLayout layout;
  final int currentPage;
  final bool movingCard;

  @override
  State<BinderPagePickerSheet> createState() => _BinderPagePickerSheetState();
}

class _BinderPagePickerSheetState extends State<BinderPagePickerSheet> {
  ScrollController? _scroll;
  final _pageNumber = TextEditingController();
  final _pageFocus = FocusNode();
  String? _pageError;
  bool _leaving = false;

  void _choosePage(int page) {
    if (_leaving) return;
    _leaving = true;
    FocusManager.instance.primaryFocus?.unfocus();
    Navigator.pop(context, page);
  }

  void _goToPage(int pages) {
    final text = _pageNumber.text.trim();
    final page = RegExp(r'^[0-9]+$').hasMatch(text) ? int.tryParse(text) : null;
    if (page == null || page < 1 || page > pages) {
      setState(() => _pageError = 'Enter a page from 1 to $pages.');
      _pageFocus.requestFocus();
      return;
    }
    _choosePage(page - 1);
  }

  @override
  void dispose() {
    _scroll?.dispose();
    _pageNumber.dispose();
    _pageFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final capacity = widget.layout.pockets;
    final pages = (widget.slots.length / capacity).ceil().clamp(1, 1000);
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    final typing = keyboard > 0 && pages > 1;
    final scale = MediaQuery.textScalerOf(context).scale(14) / 14;
    final extent = math.max(160.0, 40 + 120 * scale);
    final description =
        '${widget.layout.label} · $capacity pockets per page. '
        '${widget.movingCard ? 'Your selected card stays ready to move.' : 'Choose a page to continue arranging.'}';
    final descriptionPainter = TextPainter(
      text: TextSpan(text: description, style: theme.textTheme.bodySmall),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout(maxWidth: math.min(MediaQuery.sizeOf(context).width, 560) - 32);
    final contentHeight =
        96 +
        descriptionPainter.height +
        (typing ? 0 : pages * extent) +
        (pages > 1 ? 80 * scale : 0) +
        (_pageError == null ? 0 : 48 * scale);
    descriptionPainter.dispose();
    _scroll ??= ScrollController(
      initialScrollOffset: widget.currentPage.clamp(0, pages - 1) * extent,
    );
    return Padding(
      padding: EdgeInsets.only(bottom: keyboard),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: math.min(
            math.max(0, MediaQuery.sizeOf(context).height - keyboard) * .85,
            math.min(650, contentHeight),
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
                        'Binder pages',
                        style: theme.textTheme.titleMedium,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Close binder pages',
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Text(description, style: theme.textTheme.bodySmall),
              ),
              if (pages > 1)
                Flexible(
                  flex: typing ? 1 : 0,
                  child: SingleChildScrollView(
                    key: const ValueKey('binder-page-jump-form'),
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: TextField(
                            key: const ValueKey('binder-page-number'),
                            controller: _pageNumber,
                            focusNode: _pageFocus,
                            keyboardType: TextInputType.number,
                            textInputAction: TextInputAction.go,
                            decoration: InputDecoration(
                              labelText: 'Go to page',
                              floatingLabelBehavior:
                                  FloatingLabelBehavior.always,
                              hintText: '1–$pages',
                              errorText: _pageError,
                              errorMaxLines: 3,
                            ),
                            onChanged: (_) {
                              if (_pageError != null) {
                                setState(() => _pageError = null);
                              }
                            },
                            onSubmitted: (_) => _goToPage(pages),
                          ),
                        ),
                        const SizedBox(width: 9),
                        FilledButton(
                          key: const ValueKey('binder-page-go'),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(64, 48),
                          ),
                          onPressed: () => _goToPage(pages),
                          child: const Text('Go'),
                        ),
                      ],
                    ),
                  ),
                ),
              if (!typing)
                Expanded(
                  child: ListView.builder(
                    key: const ValueKey('binder-page-list'),
                    controller: _scroll,
                    itemExtent: extent,
                    itemCount: pages,
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    itemBuilder: (context, page) {
                      final first = page * capacity;
                      final occupied = (widget.slots.length - first).clamp(
                        0,
                        capacity,
                      );
                      final selected = page == widget.currentPage;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 9),
                        child: MergeSemantics(
                          child: Semantics(
                            key: ValueKey('binder-page-state-$page'),
                            selected: selected,
                            child: OutlinedButton(
                              key: ValueKey('binder-page-choice-$page'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.all(12),
                                side: BorderSide(
                                  color: selected
                                      ? theme.colorScheme.primary
                                      : theme.colorScheme.outlineVariant,
                                  width: selected ? 2 : 1,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              onPressed: () => _choosePage(page),
                              child: Row(
                                children: [
                                  ExcludeSemantics(
                                    child: _PageThumbnail(
                                      width: scale > 1.3 ? 64 : 96,
                                      slots: widget.slots,
                                      layout: widget.layout,
                                      first: first,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text('Page ${page + 1}'),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Pockets ${first + 1}–${first + capacity}',
                                          style: theme.textTheme.bodySmall,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '$occupied ${occupied == 1 ? 'slot' : 'slots'} · ${capacity - occupied} empty',
                                          style: theme.textTheme.bodySmall,
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Icon(
                                    selected
                                        ? Icons.check_circle_rounded
                                        : Icons.chevron_right_rounded,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PageThumbnail extends StatelessWidget {
  const _PageThumbnail({
    required this.slots,
    required this.layout,
    required this.first,
    required this.width,
  });
  final List<BinderCustomSlotDraft> slots;
  final BinderGridLayout layout;
  final int first;
  final double width;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    height: width * 1.375,
    child: FittedBox(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var row = 0; row < layout.rows; row++) ...[
            if (row > 0) const SizedBox(height: 9),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var column = 0; column < layout.columns; column++) ...[
                  if (column > 0) const SizedBox(width: 9),
                  _artwork(context, first + row * layout.columns + column),
                ],
              ],
            ),
          ],
        ],
      ),
    ),
  );

  Widget _artwork(BuildContext context, int index) => SizedBox(
    width: 48,
    height: 67.2,
    child: index < slots.length
        ? BinderArtwork(
            imageUrl: slots[index].card.hostedImageUrl,
            fallbackImageUrl: slots[index].card.fallbackImageUrl,
            size: 48,
          )
        : DecoratedBox(
            decoration: BoxDecoration(
              border: Border.all(
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
              borderRadius: BorderRadius.circular(10),
            ),
          ),
  );
}
