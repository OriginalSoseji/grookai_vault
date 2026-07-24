import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_feature_flags.dart';
import '../../services/binders/binder_repository.dart';
import '../../widgets/binders/binder_widgets.dart';
import 'binder_custom_checklist_screen.dart';

enum _BinderPreset { personal, shared, community }

class BinderCreateScreen extends StatefulWidget {
  const BinderCreateScreen({
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    this.initialTarget,
    super.key,
  });

  final BinderRepository? repository;
  final BinderFeatureFlags featureFlags;
  final BinderTargetSuggestion? initialTarget;

  @override
  State<BinderCreateScreen> createState() => _BinderCreateScreenState();
}

class _BinderCreateScreenState extends State<BinderCreateScreen> {
  late final BinderRepository _repository;
  late final TextEditingController _titleController;
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  Timer? _searchDebounce;
  BinderTargetKind _targetKind = BinderTargetKind.species;
  BinderTargetSuggestion? _target;
  _BinderPreset _preset = _BinderPreset.personal;
  List<BinderTargetSuggestion> _suggestions = const [];
  List<BinderCustomSlotDraft> _customSlots = const <BinderCustomSlotDraft>[];
  bool _searching = false;
  bool _saving = false;
  String? _error;
  int _searchGeneration = 0;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    _target = widget.initialTarget;
    _targetKind = widget.initialTarget?.kind ?? BinderTargetKind.species;
    _titleController = TextEditingController(
      text: widget.initialTarget == null
          ? ''
          : '${widget.initialTarget!.title} Binder',
    );
    if (_target == null && widget.featureFlags.personalAvailable) {
      unawaited(_searchTargets(''));
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _titleController.dispose();
    _descriptionController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(
      const Duration(milliseconds: 260),
      () => _searchTargets(value),
    );
  }

  Future<void> _searchTargets(String query) async {
    if (_targetKind == BinderTargetKind.custom) return;
    final generation = ++_searchGeneration;
    final kind = _targetKind;
    setState(() {
      _searching = true;
      _error = null;
    });
    try {
      final results = await _repository.searchTargets(kind: kind, query: query);
      if (!mounted || generation != _searchGeneration || kind != _targetKind) {
        return;
      }
      setState(() => _suggestions = results);
    } on BinderException catch (failure) {
      if (!mounted || generation != _searchGeneration || kind != _targetKind) {
        return;
      }
      setState(() => _error = failure.message);
    } finally {
      if (mounted && generation == _searchGeneration) {
        setState(() => _searching = false);
      }
    }
  }

  void _selectTarget(BinderTargetSuggestion target) {
    setState(() {
      _target = target;
      _suggestions = const [];
      _searchController.clear();
      if (_titleController.text.trim().isEmpty) {
        _titleController.text = '${target.title} Binder';
      }
    });
  }

  Future<void> _editCustomChecklist() async {
    final result = await Navigator.of(context)
        .push<List<BinderCustomSlotDraft>>(
          MaterialPageRoute<List<BinderCustomSlotDraft>>(
            builder: (_) => BinderCustomChecklistEditorScreen(
              repository: _repository,
              initialSlots: _customSlots,
            ),
          ),
        );
    if (result == null || !mounted) return;
    setState(() => _customSlots = result);
  }

  Future<void> _create() async {
    if (_saving) return;
    final title = _titleController.text.trim();
    final description = _descriptionController.text.trim();
    final target = _target;
    if (title.isEmpty) {
      setState(() => _error = 'Give this Binder a title.');
      return;
    }
    if (title.length > 80) {
      setState(() => _error = 'Binder titles can be up to 80 characters.');
      return;
    }
    if (description.length > 1000) {
      setState(
        () => _error = 'Binder descriptions can be up to 1,000 characters.',
      );
      return;
    }
    if (_targetKind != BinderTargetKind.custom && target == null) {
      setState(() => _error = 'Choose what this Binder will collect.');
      return;
    }
    if (_targetKind == BinderTargetKind.custom && _customSlots.isEmpty) {
      setState(() => _error = 'Add at least one card to the checklist.');
      return;
    }
    if (_targetKind == BinderTargetKind.custom) {
      final confirmed = await showBinderCustomChecklistPreview(
        context,
        slots: _customSlots,
        actionLabel: 'Create Binder',
      );
      if (!confirmed || !mounted) return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final publicId = await _repository.createBinder(
        CreateBinderInput(
          title: title,
          description: description,
          targetKind: _targetKind,
          targetId: target?.id ?? '',
          checklistMode: switch (_targetKind) {
            BinderTargetKind.set => BinderChecklistMode.masterSet,
            BinderTargetKind.custom => BinderChecklistMode.custom,
            BinderTargetKind.species => BinderChecklistMode.cardPrints,
          },
          // Custom covers require server-proven hosted identity artwork.
          // Search thumbnails alone are not sufficient proof, so V1 leaves
          // the cover unset instead of risking a rejected creation.
          coverReference: null,
          customSlots: _targetKind == BinderTargetKind.custom
              ? _customSlots
                    .map((slot) => slot.toWireJson())
                    .toList(growable: false)
              : const <Map<String, dynamic>>[],
        ),
      );
      if (_preset != _BinderPreset.personal) {
        try {
          await _repository.updatePolicy(
            publicId: publicId,
            readAccess: _preset == _BinderPreset.community
                ? BinderReadAccess.public
                : BinderReadAccess.private,
            discoverability: _preset == _BinderPreset.community
                ? BinderDiscoverability.listed
                : BinderDiscoverability.unlisted,
            joinPolicy: _preset == _BinderPreset.community
                ? BinderJoinPolicy.requestToJoin
                : BinderJoinPolicy.inviteOnly,
            contributionPolicy: _preset == _BinderPreset.community
                ? BinderContributionPolicy.approvalRequired
                : BinderContributionPolicy.membersDirect,
          );
        } on BinderException {
          if (!mounted) return;
          await showDialog<void>(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
              title: const Text('Binder created privately'),
              content: const Text(
                'The Binder is safe and ready, but collaboration settings '
                'could not be enabled. It remains private. Open Settings '
                'after refreshing to try again.',
              ),
              actions: [
                FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Okay'),
                ),
              ],
            ),
          );
        }
      }
      if (mounted) Navigator.of(context).pop(publicId);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final flags = widget.featureFlags;
    if (!flags.personalAvailable) {
      return Scaffold(
        appBar: AppBar(title: const Text('Create Binder')),
        body: const BinderStateMessage(
          icon: Icons.lock_clock_outlined,
          title: 'Binders are not enabled',
          body: 'Your existing Vault has not changed.',
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Create Binder')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            Text(
              'What are you building?',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 5),
            Text(
              'A Binder is a collection goal powered by exact copies in '
              'your Vault.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 18),
            SegmentedButton<BinderTargetKind>(
              segments: <ButtonSegment<BinderTargetKind>>[
                const ButtonSegment(
                  value: BinderTargetKind.species,
                  icon: Icon(Icons.catching_pokemon_outlined),
                  label: Text('Pokémon'),
                ),
                if (flags.setBindersAvailable)
                  const ButtonSegment(
                    value: BinderTargetKind.set,
                    icon: Icon(Icons.style_outlined),
                    label: Text('Set'),
                  ),
                if (flags.customBindersAvailable)
                  const ButtonSegment(
                    value: BinderTargetKind.custom,
                    icon: Icon(Icons.tune_rounded),
                    label: Text('Custom'),
                  ),
              ],
              selected: <BinderTargetKind>{_targetKind},
              onSelectionChanged: (values) {
                setState(() {
                  _targetKind = values.single;
                  _target = null;
                  _suggestions = const [];
                });
                _searchTargets('');
              },
            ),
            const SizedBox(height: 14),
            if (_target != null)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.check_circle_outline_rounded),
                  title: Text(_target!.title),
                  subtitle: Text(
                    '${_target!.kind.label}'
                    '${_target!.slotCount == null ? '' : ' · ${_target!.slotCount} card prints'}',
                  ),
                  trailing: TextButton(
                    onPressed: () {
                      setState(() => _target = null);
                      _searchTargets('');
                    },
                    child: const Text('Change'),
                  ),
                ),
              )
            else if (_targetKind != BinderTargetKind.custom) ...[
              TextField(
                controller: _searchController,
                onChanged: _onSearchChanged,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  labelText: _targetKind == BinderTargetKind.species
                      ? 'Find a Pokémon'
                      : 'Find a set',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: _searching
                      ? const Padding(
                          padding: EdgeInsets.all(13),
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 260),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: _suggestions.length,
                  itemBuilder: (context, index) {
                    final target = _suggestions[index];
                    return ListTile(
                      leading: const Icon(Icons.collections_bookmark_outlined),
                      title: Text(target.title),
                      subtitle: target.slotCount == null
                          ? null
                          : Text('${target.slotCount} card prints'),
                      enabled: target.enabled,
                      onTap: target.enabled
                          ? () => _selectTarget(target)
                          : null,
                    );
                  },
                ),
              ),
            ] else
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _customSlots.isEmpty
                            ? 'Build your checklist'
                            : '${_customSlots.length} custom '
                                  '${_customSlots.length == 1 ? 'slot' : 'slots'}',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        'Choose cards visually, including governed finish '
                        'options such as Reverse Holo, and set quantities.',
                      ),
                      const SizedBox(height: 10),
                      FilledButton.tonalIcon(
                        key: const ValueKey(
                          'binder-open-custom-checklist-editor',
                        ),
                        onPressed: _editCustomChecklist,
                        icon: const Icon(Icons.playlist_add_rounded),
                        label: Text(
                          _customSlots.isEmpty
                              ? 'Add checklist cards'
                              : 'Edit checklist',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            TextField(
              controller: _titleController,
              maxLength: 80,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Binder title',
                hintText: 'Pikachu Family Binder',
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _descriptionController,
              maxLength: 1000,
              minLines: 2,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                hintText: 'What are you hoping to complete?',
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'How will you build it?',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            RadioGroup<_BinderPreset>(
              groupValue: _preset,
              onChanged: (value) {
                if (value != null) setState(() => _preset = value);
              },
              child: Column(
                children: [
                  const RadioListTile(
                    value: _BinderPreset.personal,
                    title: Text('Personal'),
                    subtitle: Text('Private and only you can add copies'),
                  ),
                  if (flags.sharedAvailable)
                    const RadioListTile(
                      key: ValueKey('binder-preset-shared'),
                      value: _BinderPreset.shared,
                      title: Text('Family or friends'),
                      subtitle: Text('Private, invite-only collaboration'),
                    ),
                  if (flags.communityAvailable)
                    const RadioListTile(
                      value: _BinderPreset.community,
                      title: Text('Community Binder'),
                      subtitle: Text(
                        'Public, listed, and contributions require approval',
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const BinderVaultBoundaryNotice(),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Semantics(
                liveRegion: true,
                child: Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            ],
            const SizedBox(height: 18),
            FilledButton.icon(
              key: const ValueKey('binder-create-submit'),
              onPressed: _saving ? null : _create,
              icon: _saving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.add_rounded),
              label: Text(_saving ? 'Creating…' : 'Create Binder'),
            ),
          ],
        ),
      ),
    );
  }
}
