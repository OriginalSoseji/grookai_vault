import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_feature_flags.dart';
import '../../services/binders/binder_repository.dart';
import '../../widgets/binders/binder_widgets.dart';
import 'binder_collaboration_screens.dart';
import 'binder_detail_screen.dart';

/// Resolves a token-free Binder route against current server authorization.
///
/// Members receive the workspace. Everyone else gets the sanitized public
/// projection when it is lawful; both failures collapse to one generic state.
class BinderCanonicalRouteScreen extends StatefulWidget {
  const BinderCanonicalRouteScreen({
    required this.publicId,
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    super.key,
  });

  final String publicId;
  final BinderRepository? repository;
  final BinderFeatureFlags featureFlags;

  @override
  State<BinderCanonicalRouteScreen> createState() =>
      _BinderCanonicalRouteScreenState();
}

class _BinderCanonicalRouteScreenState
    extends State<BinderCanonicalRouteScreen> {
  late final BinderRepository _repository;
  bool? _memberRoute;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    unawaited(_resolve());
  }

  Future<void> _resolve() async {
    if (!widget.featureFlags.personalAvailable &&
        !widget.featureFlags.publicAvailable) {
      if (mounted) setState(() => _memberRoute = false);
      return;
    }
    if (_repository.currentUserId == null) {
      if (mounted) setState(() => _memberRoute = false);
      return;
    }
    try {
      await _repository.loadDetail(widget.publicId);
      if (mounted) setState(() => _memberRoute = true);
    } on BinderException {
      if (mounted) setState(() => _memberRoute = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.featureFlags.personalAvailable &&
        !widget.featureFlags.publicAvailable) {
      return const Scaffold(
        body: BinderStateMessage(
          icon: Icons.lock_clock_outlined,
          title: 'Binders are not enabled',
          body: 'No Binder or Vault data was changed.',
        ),
      );
    }
    final memberRoute = _memberRoute;
    if (memberRoute == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator.adaptive()),
      );
    }
    if (memberRoute) {
      return BinderDetailScreen(
        publicId: widget.publicId,
        repository: _repository,
        featureFlags: widget.featureFlags,
      );
    }
    return BinderExternalProjectionScreen.public(
      publicId: widget.publicId,
      repository: _repository,
      featureFlags: widget.featureFlags,
    );
  }
}

class BinderExternalProjectionScreen extends StatefulWidget {
  const BinderExternalProjectionScreen.public({
    required this.publicId,
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    super.key,
  }) : viewToken = null;

  const BinderExternalProjectionScreen.viewLink({
    required String token,
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    super.key,
  }) : publicId = null,
       viewToken = token;

  final String? publicId;
  final String? viewToken;
  final BinderRepository? repository;
  final BinderFeatureFlags featureFlags;

  @override
  State<BinderExternalProjectionScreen> createState() =>
      _BinderExternalProjectionScreenState();
}

class _BinderExternalProjectionScreenState
    extends State<BinderExternalProjectionScreen> {
  late final BinderRepository _repository;
  BinderDetail? _detail;
  BinderChecklistPage? _checklist;
  BinderException? _error;
  BinderException? _checklistError;
  bool _loading = true;
  bool _loadingMoreChecklist = false;
  bool _busy = false;

  bool get _isViewLink => widget.viewToken != null;
  bool get _featureAvailable => _isViewLink
      ? widget.featureFlags.viewLinksAvailable
      : widget.featureFlags.publicAvailable;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    if (_featureAvailable) {
      unawaited(_load());
    } else {
      _loading = false;
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _checklistError = null;
    });
    try {
      final detail = _isViewLink
          ? await _repository.loadViewLink(widget.viewToken!)
          : await _repository.loadPublicDetail(widget.publicId!);
      if (mounted) {
        setState(() {
          _detail = detail;
          _checklist = detail.externalChecklist;
        });
      }
    } on BinderException catch (failure) {
      if (mounted) {
        setState(() {
          _error = failure;
          _detail = null;
          _checklist = null;
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMoreChecklist() async {
    final current = _checklist;
    final cursor = current?.nextCursor;
    if (_loadingMoreChecklist ||
        current == null ||
        !current.hasMore ||
        cursor == null) {
      return;
    }
    setState(() {
      _loadingMoreChecklist = true;
      _checklistError = null;
    });
    try {
      final next = _isViewLink
          ? await _repository.loadViewLinkChecklist(
              token: widget.viewToken!,
              cursor: cursor,
            )
          : await _repository.loadPublicChecklist(
              publicId: widget.publicId!,
              cursor: cursor,
            );
      if (!mounted) return;
      final existingIds = current.items.map((item) => item.slotId).toSet();
      setState(
        () => _checklist = BinderChecklistPage(
          items: <BinderChecklistItem>[
            ...current.items,
            ...next.items.where((item) => existingIds.add(item.slotId)),
          ],
          nextCursor: next.nextCursor,
          hasMore: next.hasMore,
          memberCompletedSlots:
              next.memberCompletedSlots ?? current.memberCompletedSlots,
          externalCompletedSlots:
              next.externalCompletedSlots ?? current.externalCompletedSlots,
        ),
      );
    } on BinderException catch (failure) {
      if (mounted) setState(() => _checklistError = failure);
    } finally {
      if (mounted) setState(() => _loadingMoreChecklist = false);
    }
  }

  Future<void> _requestJoin() async {
    final detail = _detail;
    if (detail == null || _busy) return;
    if (_repository.currentUserId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sign in to request to join.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      if (detail.pendingJoinRequest == null) {
        await _repository.requestToJoin(detail.summary.publicId);
      } else {
        await _repository.withdrawJoinRequest(detail.pendingJoinRequest!.id);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              detail.pendingJoinRequest == null
                  ? 'Join request sent.'
                  : 'Join request withdrawn.',
            ),
          ),
        );
      }
      await _load();
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _report() async {
    final detail = _detail;
    if (detail == null) return;
    final reason = await showBinderReportReasonPicker(
      context,
      subjectLabel: 'this Binder',
    );
    if (reason == null) return;
    try {
      await _repository.report(
        surface: BinderReportSurface.binder,
        surfaceId: detail.summary.publicId,
        reason: reason.wireValue,
      );
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Report submitted.')));
      }
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    }
  }

  Future<void> _blockOwner() async {
    final detail = _detail;
    if (detail == null) return;
    if (_repository.currentUserId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Sign in to block.')));
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Block this Binder’s Owner?'),
        content: const Text(
          'You will stop direct interaction with the Owner. If you are a '
          'member, the server may also remove your private Binder access and '
          'withdraw your contributions. Vault copies are unchanged.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Block'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await _repository.blockOwner(detail.summary.publicId);
      if (mounted) Navigator.of(context).pop();
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    }
  }

  Future<void> _reportPublicAction({
    required BinderReportSurface surface,
    required String actionReference,
    required String subjectLabel,
  }) async {
    final detail = _detail;
    if (detail == null || _busy) return;
    final reason = await showBinderReportReasonPicker(
      context,
      subjectLabel: subjectLabel,
    );
    if (reason == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await _repository.reportPublicAction(
        publicId: detail.summary.publicId,
        surface: surface,
        actionReference: actionReference,
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
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _blockPublicMember(String memberActionReference) async {
    final detail = _detail;
    if (detail == null || _busy) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Block this contributor?'),
        content: const Text(
          'The server rechecks this temporary Binder action reference and '
          'applies only lawful relationship changes. Vault and account IDs '
          'are not exposed.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Block'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await _repository.blockPublicMember(
        publicId: detail.summary.publicId,
        memberActionReference: memberActionReference,
      );
      await _load();
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showPublicContributionActions(BinderChecklistItem item) async {
    if (item.publicContributionActions.isEmpty) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
          children: [
            Text(
              'Contribution safety',
              style: Theme.of(
                sheetContext,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            for (
              var index = 0;
              index < item.publicContributionActions.length;
              index++
            )
              Builder(
                builder: (_) {
                  final action = item.publicContributionActions[index];
                  final label =
                      action.identityVisible &&
                          (action.alias ?? '').trim().isNotEmpty
                      ? action.alias!
                      : 'Binder contributor ${index + 1}';
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            label,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 7),
                          Wrap(
                            spacing: 7,
                            runSpacing: 7,
                            children: [
                              if (action.canReport &&
                                  action.contributionActionReference != null)
                                TextButton.icon(
                                  onPressed: () {
                                    Navigator.pop(sheetContext);
                                    unawaited(
                                      _reportPublicAction(
                                        surface:
                                            BinderReportSurface.contribution,
                                        actionReference:
                                            action.contributionActionReference!,
                                        subjectLabel: 'this contribution',
                                      ),
                                    );
                                  },
                                  icon: const Icon(Icons.flag_outlined),
                                  label: const Text('Report contribution'),
                                ),
                              if (action.canReport &&
                                  action.memberActionReference != null)
                                TextButton.icon(
                                  onPressed: () {
                                    Navigator.pop(sheetContext);
                                    unawaited(
                                      _reportPublicAction(
                                        surface: BinderReportSurface.member,
                                        actionReference:
                                            action.memberActionReference!,
                                        subjectLabel: 'this contributor',
                                      ),
                                    );
                                  },
                                  icon: const Icon(Icons.person_off_outlined),
                                  label: const Text('Report member'),
                                ),
                              if (action.canBlock &&
                                  action.memberActionReference != null)
                                FilledButton.tonalIcon(
                                  onPressed: () {
                                    Navigator.pop(sheetContext);
                                    unawaited(
                                      _blockPublicMember(
                                        action.memberActionReference!,
                                      ),
                                    );
                                  },
                                  icon: const Icon(Icons.block_rounded),
                                  label: const Text('Block'),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            if (item.publicContributionActionsHaveMore)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'More contributions exist. Refresh after moderation '
                  'changes to receive currently lawful actions.',
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final detail = _detail;
    final checklist = _checklist ?? detail?.externalChecklist;
    return Scaffold(
      appBar: AppBar(
        title: Text(detail?.summary.title ?? 'Binder'),
        actions: [
          if (detail != null &&
              !_isViewLink &&
              _repository.currentUserId != null &&
              (detail.permissions.canReport ||
                  detail.permissions.canBlockOwner))
            PopupMenuButton<String>(
              tooltip: 'Safety actions',
              onSelected: (value) {
                if (value == 'report') unawaited(_report());
                if (value == 'block') unawaited(_blockOwner());
              },
              itemBuilder: (_) => [
                if (detail.permissions.canReport)
                  const PopupMenuItem(
                    value: 'report',
                    child: Text('Report Binder'),
                  ),
                if (detail.permissions.canBlockOwner)
                  const PopupMenuItem(
                    value: 'block',
                    child: Text('Block Owner'),
                  ),
              ],
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator.adaptive())
          : !_featureAvailable
          ? const BinderStateMessage(
              icon: Icons.lock_clock_outlined,
              title: 'This Binder view is not enabled',
              body: 'No Binder or Vault data was changed.',
            )
          : detail == null
          ? const BinderStateMessage(
              icon: Icons.link_off_rounded,
              title: 'Binder unavailable',
              body:
                  'This Binder or link is unavailable. It may be private, '
                  'expired, revoked, or removed.',
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      BinderArtwork(
                        imageUrl: detail.summary.coverImageUrl,
                        size: 78,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              detail.summary.title,
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              [
                                detail.summary.targetLabel,
                                detail.summary.checklistMode.label,
                                _isViewLink ? 'View-only' : 'Public',
                              ].where((item) => item.isNotEmpty).join(' · '),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (detail.summary.description.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Text(detail.summary.description),
                  ],
                  const SizedBox(height: 16),
                  BinderProgressBar(
                    completed: detail.summary.completedSlots,
                    total: detail.summary.totalSlots,
                    unit: detail.summary.effectiveProgressUnit,
                  ),
                  if (!_isViewLink &&
                      widget.featureFlags.communityAvailable &&
                      (detail.canRequestToJoin ||
                          detail.joinRequestState ==
                              BinderJoinRequestState.pending)) ...[
                    const SizedBox(height: 14),
                    FilledButton.icon(
                      onPressed:
                          _busy ||
                              (detail.joinRequestState ==
                                      BinderJoinRequestState.pending &&
                                  detail.pendingJoinRequest == null)
                          ? null
                          : _requestJoin,
                      icon: const Icon(Icons.group_add_outlined),
                      label: Text(
                        detail.joinRequestState ==
                                BinderJoinRequestState.pending
                            ? detail.pendingJoinRequest == null
                                  ? 'Join request pending'
                                  : 'Withdraw join request'
                            : 'Request to join',
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  Text(
                    'Checklist',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (checklist == null || checklist.items.isEmpty)
                    const Text('No public checklist details are available.')
                  else
                    for (final item in checklist.items)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: BinderArtwork(
                          imageUrl: item.imageUrl,
                          size: 48,
                          icon: Icons.style_outlined,
                        ),
                        title: Text(item.name),
                        subtitle: Text(
                          [
                            if ((item.setLabel ?? '').isNotEmpty)
                              item.setLabel!,
                            if ((item.number ?? '').isNotEmpty)
                              '#${item.number}',
                            if ((item.finishLabel ?? '').isNotEmpty)
                              item.finishLabel!,
                          ].join(' · '),
                        ),
                        trailing:
                            !_isViewLink &&
                                _repository.currentUserId != null &&
                                item.publicContributionActions.isNotEmpty
                            ? IconButton(
                                tooltip: 'Contribution safety actions',
                                onPressed: _busy
                                    ? null
                                    : () =>
                                          _showPublicContributionActions(item),
                                icon: const Icon(Icons.more_vert_rounded),
                              )
                            : Icon(
                                item.isSatisfied
                                    ? Icons.check_circle_rounded
                                    : Icons.radio_button_unchecked_rounded,
                                color: item.isSatisfied
                                    ? Theme.of(context).colorScheme.primary
                                    : null,
                              ),
                      ),
                  if (checklist?.hasMore ?? false)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: OutlinedButton(
                        onPressed: _loadingMoreChecklist
                            ? null
                            : _loadMoreChecklist,
                        child: Text(
                          _loadingMoreChecklist
                              ? 'Loading more…'
                              : 'Load more checklist cards',
                        ),
                      ),
                    ),
                  if (_checklistError != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _checklistError!.message,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!.message,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  Text(
                    'This view contains canonical card information only. '
                    'It does not expose Vault IDs, certificate numbers, '
                    'costs, notes, private media, or unrelated cards.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class BinderExploreScreen extends StatefulWidget {
  const BinderExploreScreen({
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    super.key,
  });

  final BinderRepository? repository;
  final BinderFeatureFlags featureFlags;

  @override
  State<BinderExploreScreen> createState() => _BinderExploreScreenState();
}

class _BinderExploreScreenState extends State<BinderExploreScreen> {
  late final BinderRepository _repository;
  BinderPage<BinderSummary>? _page;
  BinderException? _error;
  bool _loading = true;
  bool _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    if (widget.featureFlags.communityAvailable) {
      unawaited(_load());
    } else {
      _loading = false;
    }
  }

  Future<void> _load() async {
    try {
      final page = await _repository.explore();
      if (mounted) setState(() => _page = page);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    final current = _page;
    final cursor = current?.nextCursor;
    if (current == null || cursor == null || _loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final next = await _repository.explore(cursor: cursor);
      if (!mounted) return;
      final ids = current.items.map((item) => item.publicId).toSet();
      setState(
        () => _page = BinderPage<BinderSummary>(
          items: <BinderSummary>[
            ...current.items,
            ...next.items.where((item) => ids.add(item.publicId)),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Community Binders')),
      body: !widget.featureFlags.communityAvailable
          ? const BinderStateMessage(
              icon: Icons.lock_clock_outlined,
              title: 'Community Binders are not enabled',
              body: 'Private Binders and your Vault remain unchanged.',
            )
          : _loading
          ? const Center(child: CircularProgressIndicator.adaptive())
          : _error != null && _page == null
          ? BinderStateMessage(
              icon: Icons.cloud_off_outlined,
              title: 'Unable to explore',
              body: _error!.message,
              action: FilledButton(
                onPressed: _load,
                child: const Text('Try again'),
              ),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'Public collection goals with request-to-join and '
                    'approval-required contributions.',
                  ),
                  const SizedBox(height: 14),
                  if (_page?.items.isEmpty ?? true)
                    const BinderStateMessage(
                      icon: Icons.public_off_outlined,
                      title: 'No Community Binders yet',
                      body: 'Moderated public Binders will appear here.',
                    )
                  else
                    for (final binder in _page!.items) ...[
                      BinderSummaryCard(
                        binder: binder,
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                BinderExternalProjectionScreen.public(
                                  publicId: binder.publicId,
                                  repository: _repository,
                                  featureFlags: widget.featureFlags,
                                ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 9),
                    ],
                  if (_page?.hasMore ?? false)
                    OutlinedButton(
                      onPressed: _loadingMore ? null : _loadMore,
                      child: Text(
                        _loadingMore ? 'Loading…' : 'Load more Binders',
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

class BinderTemplatesScreen extends StatefulWidget {
  const BinderTemplatesScreen({
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    this.initialTemplateId,
    super.key,
  });

  final BinderRepository? repository;
  final BinderFeatureFlags featureFlags;
  final String? initialTemplateId;

  @override
  State<BinderTemplatesScreen> createState() => _BinderTemplatesScreenState();
}

class _BinderTemplatesScreenState extends State<BinderTemplatesScreen> {
  late final BinderRepository _repository;
  BinderPage<BinderTemplate>? _page;
  BinderException? _error;
  bool _loading = true;
  bool _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    if (widget.featureFlags.templatesAvailable) {
      unawaited(_load());
    } else {
      _loading = false;
    }
    final initial = (widget.initialTemplateId ?? '').trim();
    if (initial.isNotEmpty && widget.featureFlags.templatesAvailable) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) unawaited(_openTemplate(initial));
      });
    }
  }

  Future<void> _load() async {
    try {
      final page = await _repository.loadTemplates();
      if (mounted) setState(() => _page = page);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    final current = _page;
    final cursor = current?.nextCursor;
    if (current == null || cursor == null || _loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final next = await _repository.loadTemplates(cursor: cursor);
      if (!mounted) return;
      final ids = current.items.map((item) => item.id).toSet();
      setState(
        () => _page = BinderPage<BinderTemplate>(
          items: <BinderTemplate>[
            ...current.items,
            ...next.items.where((item) => ids.add(item.id)),
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

  Future<void> _openTemplate(String id) async {
    BinderTemplate template;
    try {
      template = await _repository.loadTemplate(id);
    } on BinderException catch (failure) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(failure.message)));
      }
      return;
    }
    if (!mounted) return;
    final cloneTitle = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _BinderTemplatePreviewSheet(
        template: template,
        repository: _repository,
      ),
    );
    if (cloneTitle == null || !mounted) return;
    try {
      final publicId = await _repository.cloneTemplate(
        templatePublicId: template.id,
        title: cloneTitle,
        version: template.version,
      );
      if (mounted) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => BinderDetailScreen(
              publicId: publicId,
              repository: _repository,
              featureFlags: widget.featureFlags,
            ),
          ),
        );
      }
    } on BinderException catch (failure) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(failure.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Binder Templates')),
      body: !widget.featureFlags.templatesAvailable
          ? const BinderStateMessage(
              icon: Icons.lock_clock_outlined,
              title: 'Templates are not enabled',
              body: 'Your existing Binders remain available.',
            )
          : _loading
          ? const Center(child: CircularProgressIndicator.adaptive())
          : _error != null && _page == null
          ? BinderStateMessage(
              icon: Icons.cloud_off_outlined,
              title: 'Unable to load Templates',
              body: _error!.message,
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'Templates are checklist definitions. Building one creates '
                  'a new private Binder.',
                ),
                const SizedBox(height: 14),
                if (_page?.items.isEmpty ?? true)
                  const BinderStateMessage(
                    icon: Icons.dashboard_customize_outlined,
                    title: 'No Templates yet',
                    body: 'Published, moderated Templates will appear here.',
                  )
                else
                  for (final template in _page!.items)
                    Card(
                      margin: const EdgeInsets.only(bottom: 9),
                      child: ListTile(
                        leading: BinderArtwork(
                          imageUrl: template.coverImageUrl,
                          size: 50,
                        ),
                        title: Text(template.title),
                        subtitle: Text(
                          [
                            '${template.slotCount} slots',
                            'Version ${template.version}',
                            if (template.adoptionCount != null)
                              '${template.adoptionCount} collectors building this',
                          ].join(' · '),
                        ),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => _openTemplate(template.id),
                      ),
                    ),
                if (_page?.hasMore ?? false)
                  OutlinedButton(
                    onPressed: _loadingMore ? null : _loadMore,
                    child: Text(
                      _loadingMore ? 'Loading…' : 'Load more Templates',
                    ),
                  ),
              ],
            ),
    );
  }
}

class _BinderTemplatePreviewSheet extends StatefulWidget {
  const _BinderTemplatePreviewSheet({
    required this.template,
    required this.repository,
  });

  final BinderTemplate template;
  final BinderRepository repository;

  @override
  State<_BinderTemplatePreviewSheet> createState() =>
      _BinderTemplatePreviewSheetState();
}

class _BinderTemplatePreviewSheetState
    extends State<_BinderTemplatePreviewSheet> {
  late final TextEditingController _titleController = TextEditingController(
    text: widget.template.title,
  );
  BinderChecklistPage? _checklist;
  BinderException? _error;
  bool _loading = true;
  bool _loadingMore = false;

  bool get _canClone =>
      _checklist != null &&
      (widget.template.slotCount == 0 || _checklist!.items.isNotEmpty) &&
      !_loading &&
      _titleController.text.trim().isNotEmpty &&
      _titleController.text.trim().length <= 80;

  @override
  void initState() {
    super.initState();
    _titleController.addListener(_titleChanged);
    unawaited(_loadFirstPage());
  }

  @override
  void dispose() {
    _titleController
      ..removeListener(_titleChanged)
      ..dispose();
    super.dispose();
  }

  void _titleChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadFirstPage() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final checklist = await widget.repository.loadTemplateChecklist(
        publicId: widget.template.id,
        version: widget.template.version,
      );
      if (mounted) setState(() => _checklist = checklist);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    final current = _checklist;
    final cursor = current?.nextCursor;
    if (current == null || cursor == null || _loadingMore) return;
    setState(() {
      _loadingMore = true;
      _error = null;
    });
    try {
      final next = await widget.repository.loadTemplateChecklist(
        publicId: widget.template.id,
        version: widget.template.version,
        cursor: cursor,
      );
      if (!mounted) return;
      final slotIds = current.items.map((item) => item.slotId).toSet();
      setState(
        () => _checklist = BinderChecklistPage(
          items: <BinderChecklistItem>[
            ...current.items,
            ...next.items.where((item) => slotIds.add(item.slotId)),
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

  @override
  Widget build(BuildContext context) {
    final checklist = _checklist;
    return FractionallySizedBox(
      heightFactor: 0.9,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          0,
          20,
          20 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.template.title,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 5),
            Text(widget.template.description),
            const SizedBox(height: 8),
            Text(
              '${widget.template.slotCount} checklist slots · '
              'Version ${widget.template.version}',
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _loading && checklist == null
                  ? const Center(child: CircularProgressIndicator.adaptive())
                  : _error != null && checklist == null
                  ? BinderStateMessage(
                      icon: Icons.cloud_off_outlined,
                      title: 'Unable to preview this Template',
                      body: _error!.message,
                      action: FilledButton(
                        onPressed: _loadFirstPage,
                        child: const Text('Try again'),
                      ),
                    )
                  : ListView(
                      children: [
                        if (checklist?.items.isEmpty ?? true)
                          const BinderStateMessage(
                            icon: Icons.view_list_outlined,
                            title: 'No checklist cards available',
                            body:
                                'This Template cannot be cloned until its '
                                'preview is available.',
                          )
                        else
                          for (final item in checklist!.items)
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: BinderArtwork(
                                imageUrl: item.imageUrl,
                                size: 48,
                                semanticLabel: item.name,
                              ),
                              title: Text(item.name),
                              subtitle: Text(
                                [
                                  if ((item.setLabel ?? '').isNotEmpty)
                                    item.setLabel!,
                                  if ((item.number ?? '').isNotEmpty)
                                    '#${item.number}',
                                  if ((item.finishLabel ?? '').isNotEmpty)
                                    item.finishLabel!,
                                ].join(' · '),
                              ),
                              trailing: item.requiredQuantity > 1
                                  ? Text('×${item.requiredQuantity}')
                                  : null,
                            ),
                        if (checklist?.hasMore ?? false)
                          OutlinedButton(
                            onPressed: _loadingMore ? null : _loadMore,
                            child: Text(
                              _loadingMore
                                  ? 'Loading…'
                                  : 'Load more checklist cards',
                            ),
                          ),
                        if (_error != null && checklist != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            _error!.message,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.error,
                            ),
                          ),
                        ],
                      ],
                    ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _titleController,
              maxLength: 80,
              decoration: const InputDecoration(labelText: 'Your Binder title'),
            ),
            const SizedBox(height: 10),
            const Text(
              'Build your own creates a new private Binder. Members, '
              'contributions, activity, and visibility are never copied.',
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _canClone
                    ? () => Navigator.pop(context, _titleController.text.trim())
                    : null,
                child: const Text('Build your own'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class BinderLegacyConversionScreen extends StatefulWidget {
  const BinderLegacyConversionScreen({
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    super.key,
  });

  final BinderRepository? repository;
  final BinderFeatureFlags featureFlags;

  @override
  State<BinderLegacyConversionScreen> createState() =>
      _BinderLegacyConversionScreenState();
}

class _BinderLegacyConversionScreenState
    extends State<BinderLegacyConversionScreen> {
  late final BinderRepository _repository;
  List<BinderLegacyCandidate>? _candidates;
  final Set<String> _busy = <String>{};
  BinderException? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    if (widget.featureFlags.personalAvailable) {
      unawaited(_load());
    }
  }

  Future<void> _load() async {
    try {
      final candidates = await _repository.loadLegacyCandidates();
      if (mounted) setState(() => _candidates = candidates);
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    }
  }

  Future<void> _decide(BinderLegacyCandidate candidate, bool convert) async {
    if (_busy.contains(candidate.watchId)) return;
    setState(() => _busy.add(candidate.watchId));
    try {
      final publicId = await _repository.decideLegacyCandidate(
        watchId: candidate.watchId,
        convert: convert,
        title: convert ? '${candidate.title} Binder' : null,
      );
      if (!mounted) return;
      setState(() {
        _candidates = _candidates
            ?.where((item) => item.watchId != candidate.watchId)
            .toList(growable: false);
      });
      if (convert && publicId != null) {
        final addCopies = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Private Binder created'),
            content: const Text(
              'Your tracked goal remains unchanged. Would you like to review '
              'matching copies from your Vault? Nothing is added '
              'automatically.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Not now'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Review copies'),
              ),
            ],
          ),
        );
        if (addCopies == true && mounted) {
          await Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => BinderBulkPreviewScreen(
                publicId: publicId,
                repository: _repository,
              ),
            ),
          );
        }
      }
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _busy.remove(candidate.watchId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final candidates = _candidates;
    return Scaffold(
      appBar: AppBar(title: const Text('Tracked goals to convert')),
      body: !widget.featureFlags.personalAvailable
          ? const BinderStateMessage(
              icon: Icons.lock_clock_outlined,
              title: 'Binder conversion is not enabled',
              body: 'No tracked goals or Vault data were loaded.',
            )
          : candidates == null && _error == null
          ? const Center(child: CircularProgressIndicator.adaptive())
          : _error != null && candidates == null
          ? BinderStateMessage(
              icon: Icons.cloud_off_outlined,
              title: 'Unable to load tracked goals',
              body: _error!.message,
              action: FilledButton(
                onPressed: _load,
                child: const Text('Try again'),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'Choose each goal yourself. Conversion creates a private, '
                  'owner-only Binder and keeps the original interest watch '
                  'unchanged.',
                ),
                const SizedBox(height: 16),
                if (candidates!.isEmpty)
                  const BinderStateMessage(
                    icon: Icons.done_all_rounded,
                    title: 'No tracked goals waiting',
                    body: 'Nothing was converted automatically.',
                  )
                else
                  for (final candidate in candidates)
                    Card(
                      margin: const EdgeInsets.only(bottom: 9),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              candidate.title,
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            Text(candidate.targetKind.label),
                            const SizedBox(height: 9),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton(
                                  onPressed: _busy.contains(candidate.watchId)
                                      ? null
                                      : () => _decide(candidate, false),
                                  child: const Text('Dismiss'),
                                ),
                                const SizedBox(width: 8),
                                FilledButton(
                                  onPressed: _busy.contains(candidate.watchId)
                                      ? null
                                      : () => _decide(candidate, true),
                                  child: const Text('Convert to Binder'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
              ],
            ),
    );
  }
}
