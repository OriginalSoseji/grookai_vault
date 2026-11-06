import 'dart:math' as math;
import 'package:flutter/material.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_display_identity.dart';
import '../../theme/gv_tokens.dart';

/// Chooses a canonical card reference from the caller's eligible checklist.
/// A null route result cancels; an empty string explicitly removes the cover.
class BinderCoverPickerSheet extends StatefulWidget {
  const BinderCoverPickerSheet({
    required this.candidates,
    required this.selectedId,
    this.currentId = '',
    this.canKeepCurrent = false,
    super.key,
  });
  final List<BinderChecklistItem> candidates;
  final String selectedId;
  final String currentId;
  final bool canKeepCurrent;

  @override
  State<BinderCoverPickerSheet> createState() => _BinderCoverPickerSheetState();
}

class _BinderCoverPickerSheetState extends State<BinderCoverPickerSheet> {
  final _search = TextEditingController();
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final theme = Theme.of(context);
    final terms = _search.text.trim().toLowerCase().split(RegExp(r'\s+'));
    final cards = widget.candidates
        .where((item) {
          final identity = resolveBinderChecklistItemIdentity(item);
          final text =
              '${identity.displayName} ${item.setLabel ?? ''} #${item.number ?? ''}'
                  .toLowerCase();
          return terms.every(text.contains);
        })
        .toList(growable: false);
    final missingCurrent =
        widget.currentId.isNotEmpty &&
        !widget.candidates.any((item) => item.cardPrintId == widget.currentId);
    return Padding(
      padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: math.min(
            740,
            math.max(
                  0,
                  media.size.height -
                      media.viewInsets.bottom -
                      media.padding.top,
                ) *
                .9,
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
                        'Choose Binder cover',
                        style: theme.textTheme.titleMedium,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Close cover picker',
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final scale = media.textScaler.scale(14) / 14;
                    final columns =
                        ((constraints.maxWidth - 32) /
                                (scale > 1.3 ? 210 : 150))
                            .floor()
                            .clamp(1, 4);
                    final width =
                        (constraints.maxWidth - 32 - (columns - 1) * 9) /
                        columns;
                    final artHeight = math.min(240.0, (width - 16) / .716);
                    final labelHeight =
                        media.textScaler.scale(14) * 1.5 * 2 +
                        media.textScaler.scale(12) * 1.5 * 2 +
                        28;
                    return CustomScrollView(
                      keyboardDismissBehavior:
                          ScrollViewKeyboardDismissBehavior.onDrag,
                      slivers: [
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 9),
                          sliver: SliverToBoxAdapter(
                            child: TextField(
                              key: const ValueKey('binder-cover-search'),
                              controller: _search,
                              onChanged: (_) => setState(() {}),
                              onSubmitted: (_) =>
                                  FocusScope.of(context).unfocus(),
                              textInputAction: TextInputAction.search,
                              decoration: InputDecoration(
                                labelText: 'Search checklist artwork',
                                prefixIcon: const Icon(Icons.search_rounded),
                                suffixIcon: _search.text.isEmpty
                                    ? null
                                    : IconButton(
                                        tooltip: 'Clear cover search',
                                        onPressed: () {
                                          _search.clear();
                                          setState(() {});
                                        },
                                        icon: const Icon(Icons.close_rounded),
                                      ),
                              ),
                            ),
                          ),
                        ),
                        SliverToBoxAdapter(
                          child: ListTile(
                            key: const ValueKey('binder-cover-none'),
                            leading: const Icon(Icons.hide_image_outlined),
                            title: const Text('No cover'),
                            selected: widget.selectedId.isEmpty,
                            trailing: widget.selectedId.isEmpty
                                ? const Icon(Icons.check_rounded)
                                : null,
                            onTap: () => Navigator.pop(context, ''),
                          ),
                        ),
                        if (missingCurrent)
                          SliverToBoxAdapter(
                            child: ListTile(
                              title: Text(
                                widget.canKeepCurrent
                                    ? 'Keep current cover'
                                    : 'Current cover needs replacement',
                              ),
                              enabled: widget.canKeepCurrent,
                              selected: widget.selectedId == widget.currentId,
                              onTap: widget.canKeepCurrent
                                  ? () =>
                                        Navigator.pop(context, widget.currentId)
                                  : null,
                            ),
                          ),
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 9),
                          sliver: SliverToBoxAdapter(
                            child: Text(
                              widget.candidates.isEmpty
                                  ? 'No eligible checklist artwork available.'
                                  : '${cards.length} ${cards.length == 1 ? 'cover' : 'covers'}',
                              style: theme.textTheme.bodySmall,
                            ),
                          ),
                        ),
                        if (cards.isEmpty && widget.candidates.isNotEmpty)
                          SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('No matching artwork'),
                                  TextButton(
                                    onPressed: () {
                                      _search.clear();
                                      setState(() {});
                                    },
                                    child: const Text('Clear search'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          sliver: SliverGrid.builder(
                            itemCount: cards.length,
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: columns,
                                  crossAxisSpacing: 9,
                                  mainAxisSpacing: 9,
                                  mainAxisExtent: artHeight + labelHeight + 16,
                                ),
                            itemBuilder: (context, index) {
                              final item = cards[index];
                              final name = resolveBinderChecklistItemIdentity(
                                item,
                              ).displayName;
                              final detail = [
                                if ((item.setLabel ?? '').isNotEmpty)
                                  item.setLabel!,
                                if ((item.number ?? '').isNotEmpty)
                                  '#${item.number}',
                              ].join(' · ');
                              final selected =
                                  widget.selectedId == item.cardPrintId;
                              return Semantics(
                                button: true,
                                selected: selected,
                                label: '$name. $detail. Use as Binder cover.',
                                child: Tooltip(
                                  message: '$name · $detail',
                                  child: Material(
                                    color: selected
                                        ? theme.colorScheme.primaryContainer
                                        : theme.colorScheme.surfaceContainer,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(
                                        GvRadii.surface,
                                      ),
                                      side: BorderSide(
                                        color: selected
                                            ? theme.colorScheme.primary
                                            : theme.colorScheme.outlineVariant,
                                        width: selected ? 2 : 1,
                                      ),
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child: InkWell(
                                      key: ValueKey(
                                        'binder-cover-choice-${item.cardPrintId}',
                                      ),
                                      onTap: () => Navigator.pop(
                                        context,
                                        item.cardPrintId,
                                      ),
                                      child: ExcludeSemantics(
                                        child: Padding(
                                          padding: const EdgeInsets.all(8),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.stretch,
                                            children: [
                                              SizedBox(
                                                height: artHeight,
                                                child: Stack(
                                                  fit: StackFit.expand,
                                                  children: [
                                                    ClipRRect(
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            GvRadii.artwork,
                                                          ),
                                                      child:
                                                          (item.imageUrl ?? '')
                                                              .isEmpty
                                                          ? const Center(
                                                              child: Icon(
                                                                Icons
                                                                    .image_not_supported_outlined,
                                                              ),
                                                            )
                                                          : Image.network(
                                                              item.imageUrl!,
                                                              fit: BoxFit
                                                                  .contain,
                                                              errorBuilder:
                                                                  (
                                                                    _,
                                                                    _,
                                                                    _,
                                                                  ) => const Center(
                                                                    child: Icon(
                                                                      Icons
                                                                          .image_not_supported_outlined,
                                                                    ),
                                                                  ),
                                                            ),
                                                    ),
                                                    if (selected)
                                                      Align(
                                                        alignment:
                                                            Alignment.topRight,
                                                        child: Icon(
                                                          Icons
                                                              .check_circle_rounded,
                                                          color: theme
                                                              .colorScheme
                                                              .primary,
                                                        ),
                                                      ),
                                                  ],
                                                ),
                                              ),
                                              const SizedBox(height: 8),
                                              Text(
                                                name,
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                                style:
                                                    theme.textTheme.labelLarge,
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                detail,
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                                style:
                                                    theme.textTheme.bodySmall,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
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
