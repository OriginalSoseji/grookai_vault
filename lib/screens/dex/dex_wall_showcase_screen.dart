import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/grookai_dex/dex_wall_showcase_service.dart';
import '../../widgets/card_surface_artwork.dart';

class DexWallShowcaseScreen extends StatefulWidget {
  const DexWallShowcaseScreen({
    required this.speciesSlug,
    required this.displayName,
    required this.canonicalCardPrintIds,
    this.client,
    this.onOpenSharingSettings,
    super.key,
  });

  final String speciesSlug;
  final String displayName;
  final Set<String> canonicalCardPrintIds;
  final SupabaseClient? client;
  final Future<void> Function()? onOpenSharingSettings;

  @override
  State<DexWallShowcaseScreen> createState() => _DexWallShowcaseScreenState();
}

class _DexWallShowcaseScreenState extends State<DexWallShowcaseScreen> {
  final TextEditingController _newSectionController = TextEditingController();

  late final SupabaseClient _client;
  DexWallShowcaseSelection _selection = DexWallShowcaseSelection.initial(
    const <DexWallShowcaseCopy>[],
  );
  DexWallShowcaseData? _data;
  String? _error;
  String? _selectedSectionId;
  bool _creatingSection = false;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _client = widget.client ?? Supabase.instance.client;
    _load();
  }

  @override
  void dispose() {
    _newSectionController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await DexWallShowcaseService.load(
        client: _client,
        canonicalCardPrintIds: widget.canonicalCardPrintIds,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _data = data;
        // SAFETY: Reloading never opts any exact copy into public curation.
        _selection = DexWallShowcaseSelection.initial(data.copies);
        _selectedSectionId = null;
        _creatingSection = false;
        _newSectionController.clear();
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _data = null;
        _selection = DexWallShowcaseSelection.initial(
          const <DexWallShowcaseCopy>[],
        );
        _error = _message(error);
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _toggleCopy(DexWallShowcaseCopy copy) {
    final data = _data;
    if (data == null || !data.profileGate.canPublish || !copy.isEligible) {
      return;
    }
    setState(() {
      _selection = _selection.toggle(copy.instanceId);
    });
  }

  void _chooseExistingSection(String sectionId) {
    setState(() {
      _selectedSectionId = sectionId;
      _creatingSection = false;
      _newSectionController.clear();
    });
  }

  void _chooseNewSection() {
    setState(() {
      _selectedSectionId = null;
      _creatingSection = true;
    });
  }

  bool get _canReview {
    final data = _data;
    if (_loading ||
        _saving ||
        data == null ||
        !data.profileGate.canPublish ||
        _selection.selectedInstanceIds.isEmpty) {
      return false;
    }
    if (_creatingSection) {
      final name = _newSectionController.text.trim();
      return name.isNotEmpty && name.length <= 80;
    }
    return (_selectedSectionId ?? '').trim().isNotEmpty;
  }

  String? get _targetSectionName {
    if (_creatingSection) {
      final name = _newSectionController.text.trim().replaceAll(
        RegExp(r'\s+'),
        ' ',
      );
      return name.isEmpty ? null : name;
    }
    final sectionId = _selectedSectionId;
    if (sectionId == null) {
      return null;
    }
    for (final section in _data?.sections ?? const <DexWallShowcaseSection>[]) {
      if (section.id == sectionId) {
        return section.name;
      }
    }
    return null;
  }

  Future<void> _reviewAndConfirm() async {
    if (!_canReview) {
      return;
    }
    final selectedCopies = _selection.selectedCopies;
    final sectionName = _targetSectionName;
    if (selectedCopies.isEmpty || sectionName == null) {
      return;
    }

    final confirmed =
        await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            icon: const Icon(Icons.public_rounded),
            title: const Text('Confirm public Wall update'),
            content: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Add ${selectedCopies.length} exact '
                      '${selectedCopies.length == 1 ? 'copy' : 'copies'} from '
                      '${widget.displayName} to “$sectionName”?',
                    ),
                    const SizedBox(height: 12),
                    const _WallSafetyNote(),
                    const SizedBox(height: 12),
                    for (final copy in selectedCopies.take(6))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text(
                          '• ${copy.cardName} · ${copy.setName} · '
                          '${copy.finishDisplayLabel} · '
                          '${copy.copyIdentityLabel} · '
                          '${dexWallIntentLabel(copy.intent)}',
                        ),
                      ),
                    if (selectedCopies.length > 6)
                      Text('• +${selectedCopies.length - 6} more exact copies'),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Confirm & add to Wall'),
              ),
            ],
          ),
        ) ??
        false;
    if (!confirmed || !mounted) {
      return;
    }
    await _commitConfirmedSelection();
  }

  Future<void> _commitConfirmedSelection() async {
    setState(() => _saving = true);
    try {
      final result = await DexWallShowcaseService.commit(
        client: _client,
        request: DexWallShowcaseAssignmentRequest(
          canonicalCardPrintIds: widget.canonicalCardPrintIds,
          selectedInstanceIds: _selection.selectedInstanceIds,
          existingSectionId: _creatingSection ? null : _selectedSectionId,
          newSectionName: _creatingSection ? _newSectionController.text : null,
          confirmed: true,
        ),
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              '${result.assignedCopyCount} exact '
              '${result.assignedCopyCount == 1 ? 'copy' : 'copies'} added to '
              '${result.section.name}.',
            ),
          ),
        );
      Navigator.of(context).pop(result);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(_message(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _openSharingSettings() async {
    final callback = widget.onOpenSharingSettings;
    if (callback == null) {
      return;
    }
    await callback();
    if (mounted) {
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.displayName} · Wall'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _loading || _saving ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
                sliver: SliverToBoxAdapter(
                  child: _loading
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 72),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      : _error != null
                      ? _WallSurface(
                          child: _WallEmptyState(
                            icon: Icons.error_outline_rounded,
                            title: 'Unable to prepare showcase',
                            body: _error!,
                            action: TextButton.icon(
                              onPressed: _load,
                              icon: const Icon(Icons.refresh_rounded),
                              label: const Text('Try again'),
                            ),
                          ),
                        )
                      : data == null
                      ? const SizedBox.shrink()
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _WallIntro(
                              displayName: widget.displayName,
                              copyCount: data.copies.length,
                              selectedCount:
                                  _selection.selectedInstanceIds.length,
                            ),
                            const SizedBox(height: 12),
                            _ProfileGateSurface(
                              gate: data.profileGate,
                              onOpenSettings:
                                  widget.onOpenSharingSettings == null
                                  ? null
                                  : _openSharingSettings,
                            ),
                            const SizedBox(height: 12),
                            _SectionPicker(
                              sections: data.sections,
                              selectedSectionId: _selectedSectionId,
                              creatingSection: _creatingSection,
                              newSectionController: _newSectionController,
                              enabled: data.profileGate.canPublish && !_saving,
                              onChooseExisting: _chooseExistingSection,
                              onChooseNew: _chooseNewSection,
                              onNameChanged: (_) => setState(() {}),
                            ),
                            const SizedBox(height: 16),
                            _CopyListHeading(
                              eligibleCount: data.eligibleCopyCount,
                              ineligibleCount: data.ineligibleCopyCount,
                              selectedCount:
                                  _selection.selectedInstanceIds.length,
                              onClear: _selection.selectedInstanceIds.isEmpty
                                  ? null
                                  : () => setState(() {
                                      _selection = _selection.clear();
                                    }),
                            ),
                            if (data.copies.isEmpty) ...[
                              const SizedBox(height: 10),
                              const _WallSurface(
                                child: _WallEmptyState(
                                  icon: Icons.inventory_2_outlined,
                                  title: 'No owned copies',
                                  body:
                                      'No exact owned copies match this '
                                      'canonical Dex entry.',
                                ),
                              ),
                            ],
                          ],
                        ),
                ),
              ),
              if (!_loading && _error == null && data != null)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverList.builder(
                    itemCount: data.copies.length,
                    itemBuilder: (context, index) {
                      final copy = data.copies[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _ExactCopyTile(
                          copy: copy,
                          selected: _selection.isSelected(copy.instanceId),
                          enabled:
                              data.profileGate.canPublish &&
                              copy.isEligible &&
                              !_saving,
                          onToggle: () => _toggleCopy(copy),
                        ),
                      );
                    },
                  ),
                ),
              if (!_loading &&
                  _error == null &&
                  data != null &&
                  data.copies.isNotEmpty)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                  sliver: SliverToBoxAdapter(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const _WallSafetyNote(),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                          onPressed: _canReview ? _reviewAndConfirm : null,
                          icon: _saving
                              ? const SizedBox.square(
                                  dimension: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.fact_check_outlined),
                          label: Text(
                            _saving ? 'Updating Wall' : 'Review Wall update',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
    );
  }
}

class _WallIntro extends StatelessWidget {
  const _WallIntro({
    required this.displayName,
    required this.copyCount,
    required this.selectedCount,
  });

  final String displayName;
  final int copyCount;
  final int selectedCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _WallSurface(
      emphasize: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Curate a $displayName showcase',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Review $copyCount exact owned '
            '${copyCount == 1 ? 'copy' : 'copies'}. Nothing is selected or '
            'published automatically.',
            style: theme.textTheme.bodyLarge,
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _CountPill(label: '$copyCount owned'),
              _CountPill(label: '$selectedCount selected', strong: true),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProfileGateSurface extends StatelessWidget {
  const _ProfileGateSurface({required this.gate, required this.onOpenSettings});

  final DexWallShowcaseProfileGate gate;
  final VoidCallback? onOpenSettings;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _WallSurface(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            gate.canPublish
                ? Icons.verified_user_outlined
                : Icons.lock_outline_rounded,
            color: gate.canPublish ? scheme.primary : scheme.error,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  gate.canPublish
                      ? 'Public sharing is ready'
                      : 'Public sharing is off',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(gate.guidance),
                if (!gate.canPublish && onOpenSettings != null) ...[
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: onOpenSettings,
                    icon: const Icon(Icons.settings_outlined),
                    label: const Text('Review Account settings'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionPicker extends StatelessWidget {
  const _SectionPicker({
    required this.sections,
    required this.selectedSectionId,
    required this.creatingSection,
    required this.newSectionController,
    required this.enabled,
    required this.onChooseExisting,
    required this.onChooseNew,
    required this.onNameChanged,
  });

  final List<DexWallShowcaseSection> sections;
  final String? selectedSectionId;
  final bool creatingSection;
  final TextEditingController newSectionController;
  final bool enabled;
  final ValueChanged<String> onChooseExisting;
  final VoidCallback onChooseNew;
  final ValueChanged<String> onNameChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _WallSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Choose a public Wall section',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Choose one active custom section, or explicitly name a new '
            'public section.',
          ),
          const SizedBox(height: 12),
          for (final section in sections)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _SectionChoice(
                label: section.name,
                selected: !creatingSection && selectedSectionId == section.id,
                enabled: enabled,
                icon: Icons.view_carousel_outlined,
                onTap: () => onChooseExisting(section.id),
              ),
            ),
          _SectionChoice(
            label: 'Create a new public section',
            selected: creatingSection,
            enabled: enabled,
            icon: Icons.add_box_outlined,
            onTap: onChooseNew,
          ),
          if (creatingSection) ...[
            const SizedBox(height: 10),
            TextField(
              controller: newSectionController,
              enabled: enabled,
              maxLength: 80,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Public section name',
                hintText: 'Example: Favorite Charizard Cards',
                border: OutlineInputBorder(),
              ),
              onChanged: onNameChanged,
            ),
          ],
        ],
      ),
    );
  }
}

class _SectionChoice extends StatelessWidget {
  const _SectionChoice({
    required this.label,
    required this.selected,
    required this.enabled,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final bool enabled;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      selected: selected,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(14),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          decoration: BoxDecoration(
            color: selected
                ? scheme.primaryContainer.withValues(alpha: 0.72)
                : scheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected
                  ? scheme.primary.withValues(alpha: 0.42)
                  : scheme.outlineVariant.withValues(alpha: 0.46),
            ),
          ),
          child: Row(
            children: [
              Icon(icon, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: selected ? scheme.primary : scheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CopyListHeading extends StatelessWidget {
  const _CopyListHeading({
    required this.eligibleCount,
    required this.ineligibleCount,
    required this.selectedCount,
    required this.onClear,
  });

  final int eligibleCount;
  final int ineligibleCount;
  final int selectedCount;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Choose exact copies',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
              ),
              Text(
                '$eligibleCount eligible · $ineligibleCount Hold · '
                '$selectedCount selected',
              ),
            ],
          ),
        ),
        if (onClear != null)
          TextButton(onPressed: onClear, child: const Text('Clear')),
      ],
    );
  }
}

class _ExactCopyTile extends StatelessWidget {
  const _ExactCopyTile({
    required this.copy,
    required this.selected,
    required this.enabled,
    required this.onToggle,
  });

  final DexWallShowcaseCopy copy;
  final bool selected;
  final bool enabled;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final detail = <String>[
      copy.setName,
      if ((copy.number ?? '').isNotEmpty) '#${copy.number}',
      copy.finishDisplayLabel,
      if (copy.isSlab)
        [
          copy.grader,
          copy.grade,
        ].whereType<String>().where((value) => value.isNotEmpty).join(' '),
      if (!copy.isSlab && (copy.conditionLabel ?? '').isNotEmpty)
        copy.conditionLabel!,
    ].where((value) => value.isNotEmpty).join(' · ');

    return Semantics(
      label:
          '${copy.cardName}, ${dexWallIntentLabel(copy.intent)}, '
          '${copy.finishDisplayLabel}, ${copy.copyIdentityLabel}, '
          '${copy.isEligible ? 'eligible' : 'not selectable here'}',
      checked: copy.isEligible ? selected : null,
      child: _WallSurface(
        selected: selected,
        padding: EdgeInsets.zero,
        child: InkWell(
          onTap: enabled ? onToggle : null,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CardSurfaceArtwork(
                  label: copy.cardName,
                  imageUrl: copy.hostedImageUrl,
                  fallbackImageUrl: copy.fallbackImageUrl,
                  width: 58,
                  height: 82,
                  borderRadius: 9,
                  showShadow: false,
                  enableTapToZoom: false,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        copy.cardName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        detail,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          _IntentPill(
                            label: dexWallIntentLabel(copy.intent),
                            eligible: copy.isEligible,
                          ),
                          _CountPill(label: copy.copyIdentityLabel),
                          if ((copy.certNumber ?? '').isNotEmpty)
                            _CountPill(label: 'Cert ${copy.certNumber}'),
                          if (copy.isSlab)
                            const _CountPill(label: 'Exact slab'),
                        ],
                      ),
                      if (!copy.isEligible) ...[
                        const SizedBox(height: 8),
                        Text(
                          copy.eligibilityGuidance,
                          style: Theme.of(
                            context,
                          ).textTheme.bodySmall?.copyWith(color: scheme.error),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Checkbox(
                  value: selected,
                  onChanged: enabled ? (_) => onToggle() : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WallSafetyNote extends StatelessWidget {
  const _WallSafetyNote();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.secondaryContainer.withValues(alpha: 0.48),
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.shield_outlined, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Only the selected exact copies are assigned to the section. '
              'Their current Showcase, Trade, or Sell intent is preserved. '
              'Section membership is separate from intent: changing a copy '
              'to Hold later does not remove it from this public section. '
              'Review or remove its section membership in Vault.',
            ),
          ),
        ],
      ),
    );
  }
}

class _IntentPill extends StatelessWidget {
  const _IntentPill({required this.label, required this.eligible});

  final String label;
  final bool eligible;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: eligible
            ? scheme.primaryContainer.withValues(alpha: 0.72)
            : scheme.errorContainer.withValues(alpha: 0.62),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w800),
      ),
    );
  }
}

class _CountPill extends StatelessWidget {
  const _CountPill({required this.label, this.strong = false});

  final String label;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: strong
            ? scheme.primaryContainer.withValues(alpha: 0.72)
            : scheme.surfaceContainerHighest.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _WallSurface extends StatelessWidget {
  const _WallSurface({
    required this.child,
    this.emphasize = false,
    this.selected = false,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final bool emphasize;
  final bool selected;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      padding: padding,
      decoration: BoxDecoration(
        color: emphasize
            ? scheme.primaryContainer.withValues(alpha: 0.34)
            : scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: selected
              ? scheme.primary.withValues(alpha: 0.68)
              : scheme.outlineVariant.withValues(alpha: 0.36),
          width: selected ? 1.5 : 1,
        ),
      ),
      child: child,
    );
  }
}

class _WallEmptyState extends StatelessWidget {
  const _WallEmptyState({
    required this.icon,
    required this.title,
    required this.body,
    this.action,
  });

  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 34),
        const SizedBox(height: 10),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        Text(body, textAlign: TextAlign.center),
        if (action != null) ...[const SizedBox(height: 8), action!],
      ],
    );
  }
}

String _message(Object error) {
  return error.toString().replaceFirst(
    RegExp(r'^(StateError|Exception): '),
    '',
  );
}
