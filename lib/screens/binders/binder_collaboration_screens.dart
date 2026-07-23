import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_feature_flags.dart';
import '../../services/binders/binder_repository.dart';
import '../../services/navigation/grookai_web_route_service.dart';
import '../../widgets/binders/binder_widgets.dart';

class BinderDestinationPickerScreen extends StatefulWidget {
  const BinderDestinationPickerScreen({this.repository, super.key});

  final BinderRepository? repository;

  @override
  State<BinderDestinationPickerScreen> createState() =>
      _BinderDestinationPickerScreenState();
}

class _BinderDestinationPickerScreenState
    extends State<BinderDestinationPickerScreen> {
  late final BinderRepository _repository;
  BinderLibraryPage? _library;
  BinderException? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final library = await _repository.loadLibrary();
      if (mounted) setState(() => _library = library);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    }
  }

  @override
  Widget build(BuildContext context) {
    final candidates = _library?.binders
        .where(
          (binder) =>
              !binder.isArchived &&
              binder.role.canContribute &&
              binder.lifecycle == BinderLifecycle.active,
        )
        .toList(growable: false);
    return Scaffold(
      appBar: AppBar(title: const Text('Choose a Binder')),
      body: candidates == null && _error == null
          ? const Center(child: CircularProgressIndicator.adaptive())
          : _error != null && candidates == null
          ? BinderStateMessage(
              icon: Icons.cloud_off_outlined,
              title: 'Unable to load Binders',
              body: _error!.message,
              action: FilledButton(
                onPressed: _load,
                child: const Text('Try again'),
              ),
            )
          : candidates!.isEmpty
          ? const BinderStateMessage(
              icon: Icons.collections_bookmark_outlined,
              title: 'No Binders can accept a copy',
              body:
                  'Create a Binder first, or ask its Owner to give you '
                  'Contributor access.',
            )
          : ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: candidates.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final binder = candidates[index];
                return BinderSummaryCard(
                  binder: binder,
                  onTap: () => Navigator.of(context).pop(binder),
                );
              },
            ),
    );
  }
}

class BinderExactCopyPickerScreen extends StatefulWidget {
  const BinderExactCopyPickerScreen({
    required this.publicId,
    this.repository,
    this.allowMultiple = true,
    this.cardPrintId,
    this.contextLabel,
    super.key,
  });

  final String publicId;
  final BinderRepository? repository;
  final bool allowMultiple;
  final String? cardPrintId;
  final String? contextLabel;

  @override
  State<BinderExactCopyPickerScreen> createState() =>
      _BinderExactCopyPickerScreenState();
}

class _BinderExactCopyPickerScreenState
    extends State<BinderExactCopyPickerScreen> {
  late final BinderRepository _repository;
  BinderPage<BinderEligibleCopy>? _page;
  final Set<String> _selected = <String>{};
  BinderException? _error;
  bool _loading = true;
  bool _loadingMore = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    unawaited(_load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await _loadEligiblePage();
      if (mounted) {
        setState(() => _page = page);
      }
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<BinderPage<BinderEligibleCopy>> _loadEligiblePage({
    BinderCursor? cursor,
  }) async {
    final cardPrintId = (widget.cardPrintId ?? '').trim();
    var page = await _repository.loadEligibleCopies(
      publicId: widget.publicId,
      cursor: cursor,
    );
    if (cardPrintId.isEmpty) return page;

    final matches = <BinderEligibleCopy>[];
    while (true) {
      matches.addAll(
        page.items.where((copy) => copy.cardPrintId == cardPrintId),
      );
      if (matches.isNotEmpty || !page.hasMore || page.nextCursor == null) {
        return BinderPage<BinderEligibleCopy>(
          items: matches,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        );
      }
      page = await _repository.loadEligibleCopies(
        publicId: widget.publicId,
        cursor: page.nextCursor,
      );
    }
  }

  Future<void> _loadMore() async {
    final current = _page;
    final cursor = current?.nextCursor;
    if (_loadingMore || current == null || !current.hasMore || cursor == null) {
      return;
    }
    setState(() {
      _loadingMore = true;
      _error = null;
    });
    try {
      final next = await _loadEligiblePage(cursor: cursor);
      if (!mounted) return;
      final existingIds = current.items.map((copy) => copy.instanceId).toSet();
      setState(
        () => _page = BinderPage<BinderEligibleCopy>(
          items: <BinderEligibleCopy>[
            ...current.items,
            ...next.items.where((copy) => existingIds.add(copy.instanceId)),
          ],
          nextCursor: next.nextCursor,
          hasMore: next.hasMore,
        ),
      );
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _toggle(BinderEligibleCopy copy) {
    if (!copy.isEligible || _saving) return;
    setState(() {
      if (!widget.allowMultiple) _selected.clear();
      if (!_selected.add(copy.instanceId)) _selected.remove(copy.instanceId);
    });
  }

  Future<void> _addSelected() async {
    if (_selected.isEmpty || _saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (_selected.length == 1) {
        await _repository.addContribution(
          publicId: widget.publicId,
          vaultItemInstanceId: _selected.single,
        );
      } else {
        await _repository.addBulkContributions(
          publicId: widget.publicId,
          vaultItemInstanceIds: _selected.toList(growable: false),
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          (widget.contextLabel ?? '').trim().isEmpty
              ? 'Add your copy'
              : 'Add ${widget.contextLabel}',
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 10, 16, 8),
              child: BinderVaultBoundaryNotice(),
            ),
            if (_error != null)
              MaterialBanner(
                content: Text(_error!.message),
                leading: const Icon(Icons.error_outline_rounded),
                actions: [
                  TextButton(onPressed: _load, child: const Text('Retry')),
                ],
              ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator.adaptive())
                  : (_page?.items.isEmpty ?? true)
                  ? const BinderStateMessage(
                      icon: Icons.inventory_2_outlined,
                      title: 'No eligible copy',
                      body:
                          'You don’t have a matching copy in Vault. '
                          'Scan or search to add one.',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(12, 4, 12, 100),
                      itemCount: _page!.items.length + (_page!.hasMore ? 1 : 0),
                      separatorBuilder: (_, _) => const SizedBox(height: 6),
                      itemBuilder: (context, index) {
                        if (index == _page!.items.length) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: OutlinedButton(
                              onPressed: _loadingMore ? null : _loadMore,
                              child: Text(
                                _loadingMore
                                    ? 'Loading more…'
                                    : (widget.cardPrintId ?? '').trim().isEmpty
                                    ? 'Load more copies'
                                    : 'Find more matching copies',
                              ),
                            ),
                          );
                        }
                        final copy = _page!.items[index];
                        final selected = _selected.contains(copy.instanceId);
                        return Semantics(
                          button: copy.isEligible,
                          selected: selected,
                          label:
                              '${copy.name}, '
                              '${copy.finishLabel ?? 'finish unresolved'}, '
                              '${copy.isEligible ? 'eligible' : copy.reason ?? copy.eligibility}',
                          child: Card(
                            child: CheckboxListTile(
                              value: selected,
                              onChanged: copy.isEligible
                                  ? (_) => _toggle(copy)
                                  : null,
                              secondary: BinderArtwork(
                                imageUrl: copy.imageUrl,
                                size: 50,
                                icon: Icons.style_outlined,
                              ),
                              title: Text(copy.name),
                              subtitle: Text(
                                [
                                  if ((copy.setLabel ?? '').isNotEmpty)
                                    copy.setLabel,
                                  if ((copy.number ?? '').isNotEmpty)
                                    '#${copy.number}',
                                  copy.finishLabel ?? 'Finish needs review',
                                  if (!copy.isEligible)
                                    copy.reason ?? copy.eligibility,
                                ].whereType<String>().join(' · '),
                              ),
                              controlAffinity: ListTileControlAffinity.trailing,
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        minimum: const EdgeInsets.all(16),
        child: FilledButton.icon(
          onPressed: _selected.isEmpty || _saving ? null : _addSelected,
          icon: _saving
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.add_rounded),
          label: Text(
            _saving
                ? 'Adding…'
                : _selected.length == 1
                ? 'Add selected copy'
                : 'Add ${_selected.length} selected copies',
          ),
        ),
      ),
    );
  }
}

class BinderBulkPreviewScreen extends StatefulWidget {
  const BinderBulkPreviewScreen({
    required this.publicId,
    this.repository,
    super.key,
  });

  final String publicId;
  final BinderRepository? repository;

  @override
  State<BinderBulkPreviewScreen> createState() =>
      _BinderBulkPreviewScreenState();
}

class _BinderBulkPreviewScreenState extends State<BinderBulkPreviewScreen> {
  late final BinderRepository _repository;
  BinderBulkPreview? _preview;
  BinderException? _error;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    unawaited(_load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final preview = await _repository.previewBulk(publicId: widget.publicId);
      if (mounted) setState(() => _preview = preview);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _confirm() async {
    final eligibleIds = _preview?.sample
        .where((item) => item.isEligible)
        .map((item) => item.instanceId)
        .toList(growable: false);
    if (eligibleIds == null || eligibleIds.isEmpty || _saving) return;
    setState(() => _saving = true);
    try {
      final accepted = await _repository.addBulkContributions(
        publicId: widget.publicId,
        vaultItemInstanceIds: eligibleIds,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$accepted copies added or submitted.')),
      );
      Navigator.of(context).pop(true);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final preview = _preview;
    return Scaffold(
      appBar: AppBar(title: const Text('Add matching Vault copies')),
      body: _loading
          ? const Center(child: CircularProgressIndicator.adaptive())
          : _error != null && preview == null
          ? BinderStateMessage(
              icon: Icons.error_outline_rounded,
              title: 'Preview unavailable',
              body: _error!.message,
              action: FilledButton(
                onPressed: _load,
                child: const Text('Try again'),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const BinderVaultBoundaryNotice(),
                const SizedBox(height: 16),
                Text(
                  'Review before adding',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 4),
                const Text(
                  'Nothing is added automatically. This preview uses only '
                  'your eligible Vault copies.',
                ),
                const SizedBox(height: 16),
                _BulkCountRow(
                  icon: Icons.check_circle_outline_rounded,
                  label: 'Eligible',
                  count: preview?.eligibleCount ?? 0,
                ),
                _BulkCountRow(
                  icon: Icons.copy_all_outlined,
                  label: 'Already linked',
                  count: preview?.duplicateCount ?? 0,
                ),
                _BulkCountRow(
                  icon: Icons.help_outline_rounded,
                  label: 'Needs finish/review',
                  count: preview?.unresolvedCount ?? 0,
                ),
                _BulkCountRow(
                  icon: Icons.block_outlined,
                  label: 'Ineligible',
                  count: preview?.ineligibleCount ?? 0,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!.message,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
                const SizedBox(height: 22),
                FilledButton.icon(
                  onPressed: (preview?.eligibleCount ?? 0) == 0 || _saving
                      ? null
                      : _confirm,
                  icon: _saving
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.add_task_rounded),
                  label: Text(
                    _saving
                        ? 'Adding…'
                        : 'Confirm ${preview?.sample.where((item) => item.isEligible).length ?? 0} in this batch',
                  ),
                ),
                if ((preview?.eligibleCount ?? 0) >
                    (preview?.sample.where((item) => item.isEligible).length ??
                        0))
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'Large additions are bounded. Return to preview the '
                      'next batch after this one completes.',
                      textAlign: TextAlign.center,
                    ),
                  ),
              ],
            ),
    );
  }
}

class _BulkCountRow extends StatelessWidget {
  const _BulkCountRow({
    required this.icon,
    required this.label,
    required this.count,
  });

  final IconData icon;
  final String label;
  final int count;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon),
      title: Text(label),
      trailing: Text(
        '$count',
        style: Theme.of(
          context,
        ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
      ),
    );
  }
}

class BinderInvitationRouteScreen extends StatefulWidget {
  const BinderInvitationRouteScreen({
    required this.token,
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    this.onAccepted,
    super.key,
  });

  final String token;
  final BinderRepository? repository;
  final BinderFeatureFlags featureFlags;
  final ValueChanged<String>? onAccepted;

  @override
  State<BinderInvitationRouteScreen> createState() =>
      _BinderInvitationRouteScreenState();
}

class _BinderInvitationRouteScreenState
    extends State<BinderInvitationRouteScreen> {
  late final BinderRepository _repository;
  BinderInvitation? _invitation;
  BinderException? _error;
  bool _loading = true;
  bool _responding = false;
  bool _reporting = false;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    if (!widget.featureFlags.sharedAvailable ||
        _repository.currentUserId == null) {
      _loading = false;
    } else {
      unawaited(_load());
    }
  }

  Future<void> _load() async {
    try {
      final invitation = await _repository.previewInvitation(widget.token);
      if (mounted) setState(() => _invitation = invitation);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _respond(bool accept) async {
    if (_responding) return;
    setState(() => _responding = true);
    try {
      if (accept) {
        final publicId = await _repository.acceptInvitation(widget.token);
        if (!mounted) return;
        widget.onAccepted?.call(publicId);
        Navigator.of(context).pop(publicId);
      } else {
        await _repository.declineInvitation(widget.token);
        if (mounted) Navigator.of(context).pop();
      }
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _responding = false);
    }
  }

  Future<void> _report() async {
    if (_reporting) return;
    final reason = await showBinderReportReasonPicker(
      context,
      subjectLabel: 'this invitation',
    );
    if (reason == null || !mounted) return;
    setState(() => _reporting = true);
    try {
      await _repository.reportInvitationToken(
        token: widget.token,
        reason: reason.wireValue,
      );
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Report submitted.')));
      }
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _reporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final signedIn = _repository.currentUserId != null;
    return Scaffold(
      appBar: AppBar(title: const Text('Binder invitation')),
      body: !widget.featureFlags.sharedAvailable
          ? const BinderStateMessage(
              icon: Icons.lock_clock_outlined,
              title: 'Shared Binders are not enabled',
              body: 'No invitation or Vault data was loaded.',
            )
          : _loading
          ? const Center(child: CircularProgressIndicator.adaptive())
          : !signedIn
          ? const BinderStateMessage(
              icon: Icons.login_rounded,
              title: 'Sign in to view this invitation',
              body:
                  'Binder, inviter, and role details stay hidden until '
                  'you sign in and the invitation is validated.',
            )
          : _error != null || _invitation == null
          ? const BinderStateMessage(
              icon: Icons.link_off_rounded,
              title: 'Invitation unavailable',
              body: 'It may have expired, been revoked, or already been used.',
            )
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  _invitation!.binderTitle ?? 'Shared Binder',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 7),
                Text(
                  'You’re invited as ${_invitation!.maximumRole.label}.',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 16),
                BinderVaultBoundaryNotice(message: _invitation!.privacyCopy),
                const SizedBox(height: 16),
                const Text(
                  'Accepting does not enable a public profile, publish to '
                  'Wall or Pulse, or add any card automatically.',
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!.message,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: _reporting ? null : _report,
                      icon: const Icon(Icons.flag_outlined),
                      label: Text(_reporting ? 'Reporting…' : 'Report'),
                    ),
                    TextButton(
                      onPressed: _responding ? null : () => _respond(false),
                      child: const Text('Decline'),
                    ),
                    const SizedBox(width: 10),
                    FilledButton(
                      onPressed: _responding ? null : () => _respond(true),
                      child: Text(_responding ? 'Responding…' : 'Accept'),
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}

class BinderInvitePeopleScreen extends StatefulWidget {
  const BinderInvitePeopleScreen({
    required this.publicId,
    required this.viewerRole,
    this.repository,
    super.key,
  });

  final String publicId;
  final BinderRole viewerRole;
  final BinderRepository? repository;

  @override
  State<BinderInvitePeopleScreen> createState() =>
      _BinderInvitePeopleScreenState();
}

class _BinderInvitePeopleScreenState extends State<BinderInvitePeopleScreen> {
  late final BinderRepository _repository;
  BinderRole _role = BinderRole.contributor;
  BinderInvitation? _created;
  bool _saving = false;
  BinderException? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
  }

  Future<void> _create() async {
    setState(() {
      _saving = true;
      _error = null;
      _created = null;
    });
    try {
      final invitation = await _repository.createInvitation(
        publicId: widget.publicId,
        maximumRole: _role,
      );
      if (mounted) setState(() => _created = invitation);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _copy() async {
    final invitation = _created;
    final token = invitation?.plaintextToken;
    if (token == null || token.isEmpty) return;
    final url =
        'https://grookaivault.com/binder-invites/${Uri.encodeComponent(token)}';
    await Clipboard.setData(ClipboardData(text: url));
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Invitation link copied.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final roles = <BinderRole>[BinderRole.contributor, BinderRole.viewer];
    return Scaffold(
      appBar: AppBar(title: const Text('Invite people')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Create a one-use invitation. The first eligible signed-in '
            'collector can accept it.',
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<BinderRole>(
            initialValue: _role,
            decoration: const InputDecoration(labelText: 'Maximum role'),
            items: roles
                .map(
                  (role) =>
                      DropdownMenuItem(value: role, child: Text(role.label)),
                )
                .toList(growable: false),
            onChanged: (value) {
              if (value != null) setState(() => _role = value);
            },
          ),
          if (widget.viewerRole == BinderRole.owner) ...[
            const SizedBox(height: 8),
            const Text(
              'To add a Manager, invite them as a Contributor and promote '
              'them after they join. General links cannot grant Manager.',
            ),
          ],
          const SizedBox(height: 16),
          const BinderVaultBoundaryNotice(),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: _saving ? null : _create,
            icon: _saving
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.person_add_alt_1_rounded),
            label: Text(_saving ? 'Creating…' : 'Create invitation'),
          ),
          if (_created != null) ...[
            const SizedBox(height: 18),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Invitation ready'),
                    const SizedBox(height: 5),
                    const Text(
                      'This secret is shown once. It is not stored in '
                      'general app cache.',
                    ),
                    const SizedBox(height: 12),
                    FilledButton.tonalIcon(
                      onPressed: _copy,
                      icon: const Icon(Icons.copy_rounded),
                      label: const Text('Copy invitation link'),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!.message,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
        ],
      ),
    );
  }
}

class BinderShareSettingsScreen extends StatefulWidget {
  const BinderShareSettingsScreen({
    required this.detail,
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    super.key,
  });

  final BinderDetail detail;
  final BinderRepository? repository;
  final BinderFeatureFlags featureFlags;

  @override
  State<BinderShareSettingsScreen> createState() =>
      _BinderShareSettingsScreenState();
}

class _BinderShareSettingsScreenState extends State<BinderShareSettingsScreen> {
  late final BinderRepository _repository;
  BinderViewLink? _newLink;
  bool _busy = false;
  BinderException? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
  }

  Future<void> _createViewLink() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final link = await _repository.createViewLink(
        publicId: widget.detail.summary.publicId,
        label: 'Shared from mobile',
      );
      if (mounted) setState(() => _newLink = link);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _copyViewLink() async {
    final token = _newLink?.plaintextToken;
    final providedUrl = _newLink?.url;
    final url = (providedUrl ?? '').trim().isNotEmpty
        ? providedUrl!
        : token == null
        ? null
        : GrookaiWebRouteService.buildUri(
            '/b/${Uri.encodeComponent(token)}',
          ).toString();
    if (url == null) return;
    await Clipboard.setData(ClipboardData(text: url));
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('View-only link copied.')));
    }
  }

  Future<void> _rotateViewLink(BinderViewLink link) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final rotated = await _repository.rotateViewLink(link.id);
      if (mounted) setState(() => _newLink = rotated);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _makePublic() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Make this Binder public?'),
        content: const Text(
          'Existing member contributions stay excluded until each member '
          'separately consents. This does not enable anyone’s public profile, '
          'Wall, or Pulse.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Make public'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _busy = true);
    try {
      await _repository.updatePolicy(
        publicId: widget.detail.summary.publicId,
        readAccess: BinderReadAccess.public,
        discoverability: BinderDiscoverability.unlisted,
        joinPolicy: widget.detail.summary.joinPolicy,
        contributionPolicy: widget.detail.summary.contributionPolicy,
      );
      if (mounted) Navigator.of(context).pop(true);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final flags = widget.featureFlags;
    return Scaffold(
      appBar: AppBar(title: const Text('Share Binder')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.person_add_alt_1_rounded),
            title: const Text('Invite people'),
            subtitle: const Text('Add authenticated collaborators by role'),
            trailing: const Icon(Icons.chevron_right_rounded),
            enabled: flags.sharedAvailable,
            onTap: flags.sharedAvailable
                ? () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => BinderInvitePeopleScreen(
                        publicId: widget.detail.summary.publicId,
                        viewerRole: widget.detail.summary.role,
                        repository: _repository,
                      ),
                    ),
                  )
                : null,
          ),
          const Divider(),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.link_rounded),
            title: const Text('Create view-only link'),
            subtitle: const Text(
              'Anyone with the link can see a sanitized, read-only view',
            ),
            enabled: flags.viewLinksAvailable && !_busy,
            onTap: flags.viewLinksAvailable ? _createViewLink : null,
          ),
          if (_newLink != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: FilledButton.tonalIcon(
                onPressed: _copyViewLink,
                icon: const Icon(Icons.copy_rounded),
                label: const Text('Copy new view-only link'),
              ),
            ),
          for (final link in widget.detail.viewLinks)
            ListTile(
              title: Text(link.label),
              subtitle: Text(link.isActive ? 'Active' : 'Revoked or expired'),
              trailing: link.isActive
                  ? PopupMenuButton<String>(
                      enabled: !_busy,
                      onSelected: (value) async {
                        if (value == 'rotate') {
                          await _rotateViewLink(link);
                        } else if (value == 'revoke') {
                          setState(() => _busy = true);
                          try {
                            await _repository.revokeViewLink(link.id);
                            if (context.mounted) {
                              Navigator.of(context).pop(true);
                            }
                          } on BinderException catch (failure) {
                            if (mounted) setState(() => _error = failure);
                          } finally {
                            if (mounted) setState(() => _busy = false);
                          }
                        }
                      },
                      itemBuilder: (_) => const [
                        PopupMenuItem(
                          value: 'rotate',
                          child: Text('Rotate link'),
                        ),
                        PopupMenuItem(
                          value: 'revoke',
                          child: Text('Revoke link'),
                        ),
                      ],
                    )
                  : null,
            ),
          const Divider(),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.public_rounded),
            title: const Text('Make public'),
            subtitle: const Text(
              'Visibility is separate from collaboration and consent',
            ),
            enabled:
                flags.publicAvailable &&
                widget.detail.permissions.canManagePolicy &&
                widget.detail.summary.readAccess != BinderReadAccess.public &&
                !_busy,
            onTap: _makePublic,
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                _error!.message,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
        ],
      ),
    );
  }
}

class BinderOwnerTransferScreen extends StatefulWidget {
  const BinderOwnerTransferScreen({
    required this.publicId,
    required this.members,
    this.repository,
    super.key,
  });

  final String publicId;
  final List<BinderMember> members;
  final BinderRepository? repository;

  @override
  State<BinderOwnerTransferScreen> createState() =>
      _BinderOwnerTransferScreenState();
}

class _BinderOwnerTransferScreenState extends State<BinderOwnerTransferScreen> {
  late final BinderRepository _repository;
  BinderMember? _target;
  BinderOwnerTransferDisposition _formerDisposition =
      BinderOwnerTransferDisposition.manager;
  bool _busy = false;
  BinderException? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
  }

  Future<void> _offer() async {
    final target = _target;
    if (target == null || _busy) return;
    setState(() => _busy = true);
    try {
      await _repository.offerOwnerTransfer(
        publicId: widget.publicId,
        targetMemberId: target.membershipId,
        formerOwnerDisposition: _formerDisposition,
      );
      if (mounted) Navigator.of(context).pop(true);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final candidates = widget.members
        .where(
          (member) =>
              member.state == BinderMembershipState.active &&
              member.role != BinderRole.owner &&
              !member.isCurrentUser,
        )
        .toList(growable: false);
    return Scaffold(
      appBar: AppBar(title: const Text('Transfer ownership')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'The selected member must explicitly accept. You remain Owner '
            'until that atomic transfer completes.',
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<BinderMember>(
            initialValue: _target,
            decoration: const InputDecoration(labelText: 'New Owner'),
            items: candidates
                .map(
                  (member) => DropdownMenuItem(
                    value: member,
                    child: Text(member.displayLabel),
                  ),
                )
                .toList(growable: false),
            onChanged: (value) => setState(() => _target = value),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<BinderOwnerTransferDisposition>(
            initialValue: _formerDisposition,
            decoration: const InputDecoration(
              labelText: 'Your role after transfer',
            ),
            items: BinderOwnerTransferDisposition.values
                .map(
                  (disposition) => DropdownMenuItem(
                    value: disposition,
                    child: Text(disposition.label),
                  ),
                )
                .toList(growable: false),
            onChanged: (value) {
              if (value != null) {
                setState(() => _formerDisposition = value);
              }
            },
          ),
          if (_formerDisposition.leavesBinder)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Card(
                color: Theme.of(context).colorScheme.tertiaryContainer,
                child: const Padding(
                  padding: EdgeInsets.all(12),
                  child: Text(
                    'After the new Owner accepts, you will leave this Binder. '
                    'Your live contributions will be withdrawn and your Vault '
                    'copies will remain unchanged.',
                  ),
                ),
              ),
            ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!.message,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _target == null || _busy ? null : _offer,
            child: Text(_busy ? 'Creating offer…' : 'Offer ownership'),
          ),
        ],
      ),
    );
  }
}
