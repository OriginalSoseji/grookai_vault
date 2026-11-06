import 'package:flutter/material.dart';
import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_display_identity.dart';
import 'binder_cover_picker_sheet.dart';
import 'binder_widgets.dart';

class BinderMetadataDraft {
  const BinderMetadataDraft({
    required this.title,
    required this.description,
    required this.coverCardPrintId,
  });
  final String title;
  final String description;
  final String? coverCardPrintId;
}

/// Owns text controllers until the dialog route finishes its exit transition.
class BinderMetadataDialog extends StatefulWidget {
  const BinderMetadataDialog({
    super.key,
    required this.title,
    required this.description,
    required this.candidates,
    required this.currentCoverId,
    required this.requiresHostedCover,
    this.currentCoverImageUrl,
  });
  final String title;
  final String description;
  final List<BinderChecklistItem> candidates;
  final String currentCoverId;
  final bool requiresHostedCover;
  final String? currentCoverImageUrl;
  @override
  State<BinderMetadataDialog> createState() => _BinderMetadataDialogState();
}

class _BinderMetadataDialogState extends State<BinderMetadataDialog> {
  late final _title = TextEditingController(text: widget.title);
  late final _description = TextEditingController(text: widget.description);
  late String _selectedCover = widget.currentCoverId;
  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selectedItem = widget.candidates
        .where((item) => item.cardPrintId == _selectedCover)
        .firstOrNull;
    final selectionIsEligible =
        _selectedCover.isEmpty ||
        selectedItem != null ||
        !widget.requiresHostedCover;
    return AlertDialog(
      title: const Text('Edit Binder details'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _title,
              maxLength: 80,
              decoration: const InputDecoration(labelText: 'Title'),
            ),
            TextField(
              controller: _description,
              maxLength: 1000,
              minLines: 2,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            const SizedBox(height: 10),
            InputDecorator(
              decoration: InputDecoration(
                labelText: 'Binder cover',
                helperText: widget.requiresHostedCover
                    ? 'Public, listed, and custom Binders use verified '
                          'grookai-hosted artwork only.'
                    : 'Choose a governed card from this checklist.',
                helperMaxLines: 4,
                errorMaxLines: 4,
                errorText: selectionIsEligible
                    ? null
                    : 'Choose a grookai-hosted card or explicitly '
                          'choose No cover.',
              ),
              child: InkWell(
                key: ValueKey('binder-cover-$_selectedCover'),
                borderRadius: BorderRadius.circular(8),
                onTap: () async {
                  FocusScope.of(context).unfocus();
                  final chosen = await showModalBottomSheet<String>(
                    context: context,
                    isScrollControlled: true,
                    useSafeArea: true,
                    constraints: const BoxConstraints(maxWidth: 640),
                    builder: (_) => BinderCoverPickerSheet(
                      candidates: widget.candidates,
                      selectedId: _selectedCover,
                      currentId: widget.currentCoverId,
                      canKeepCurrent: !widget.requiresHostedCover,
                    ),
                  );
                  if (chosen != null && context.mounted) {
                    setState(() => _selectedCover = chosen);
                  }
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      BinderArtwork(
                        imageUrl: _selectedCover.isEmpty
                            ? null
                            : selectedItem?.imageUrl ??
                                  (_selectedCover == widget.currentCoverId
                                      ? widget.currentCoverImageUrl
                                      : null),
                        size: 48,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selectedCover.isEmpty
                                  ? 'No cover'
                                  : selectedItem != null
                                  ? resolveBinderChecklistItemIdentity(
                                      selectedItem,
                                    ).displayName
                                  : (widget.requiresHostedCover
                                        ? 'Current cover needs replacement'
                                        : 'Keep current cover'),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (selectedItem != null)
                              Text(
                                [
                                  if ((selectedItem.setLabel ?? '').isNotEmpty)
                                    selectedItem.setLabel!,
                                  if ((selectedItem.number ?? '').isNotEmpty)
                                    '#${selectedItem.number}',
                                ].join(' · '),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            Text(
                              'Choose artwork',
                              style: Theme.of(context).textTheme.labelMedium
                                  ?.copyWith(
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.primary,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: selectionIsEligible
              ? () => Navigator.pop(
                  context,
                  BinderMetadataDraft(
                    title: _title.text,
                    description: _description.text,
                    coverCardPrintId: _selectedCover.isEmpty
                        ? null
                        : _selectedCover,
                  ),
                )
              : null,
          child: const Text('Save'),
        ),
      ],
    );
  }
}
