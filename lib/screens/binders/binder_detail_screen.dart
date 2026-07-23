import 'dart:async';

import 'package:flutter/material.dart';

import '../../controllers/binders/binder_controllers.dart';
import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_feature_flags.dart';
import '../../services/binders/binder_realtime_service.dart';
import '../../services/binders/binder_repository.dart';
import '../../widgets/binders/binder_widgets.dart';
import 'binder_collaboration_screens.dart';
import 'binder_custom_checklist_screen.dart';
import 'binder_moderation_screen.dart';

class BinderDetailScreen extends StatefulWidget {
  const BinderDetailScreen({
    required this.publicId,
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    super.key,
  });

  final String publicId;
  final BinderRepository? repository;
  final BinderFeatureFlags featureFlags;

  @override
  State<BinderDetailScreen> createState() => _BinderDetailScreenState();
}

class _BinderDetailScreenState extends State<BinderDetailScreen> {
  late final BinderRepository _repository;
  late final BinderDetailController _controller;
  BinderRealtimeLease? _realtimeLease;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    _controller = BinderDetailController(
      publicId: widget.publicId,
      repository: _repository,
    )..addListener(_onChanged);
    if (widget.featureFlags.personalAvailable) {
      unawaited(_controller.load());
    }
  }

  @override
  void dispose() {
    _realtimeLease?.dispose();
    _controller
      ..removeListener(_onChanged)
      ..dispose();
    super.dispose();
  }

  void _onChanged() {
    _syncRealtime();
    if (mounted) setState(() {});
  }

  void _syncRealtime() {
    final detail = _controller.detail;
    final repository = _repository;
    final authorized =
        detail != null &&
        detail.membershipState == BinderMembershipState.active &&
        detail.summary.lifecycle != BinderLifecycle.deletedTombstone &&
        detail.summary.moderationState != BinderModerationState.removed;
    if (!authorized || repository is! SupabaseBinderRepository) {
      _realtimeLease?.dispose();
      _realtimeLease = null;
      return;
    }
    if (_realtimeLease != null) return;
    final lease = BinderRealtimeLease(
      client: repository.realtimeClient,
      publicId: widget.publicId,
      onGuardedRefresh: _controller.refreshFromSignal,
    );
    _realtimeLease = lease;
    unawaited(lease.start());
  }

  void _showFailure() {
    final failure = _controller.error;
    if (failure == null || !mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(failure.message)));
  }

  Future<void> _openAddCopy() async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => BinderExactCopyPickerScreen(
          publicId: widget.publicId,
          repository: _repository,
        ),
      ),
    );
    if (changed == true) await _controller.load(preserveContent: true);
  }

  Future<void> _openBulk() async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => BinderBulkPreviewScreen(
          publicId: widget.publicId,
          repository: _repository,
        ),
      ),
    );
    if (changed == true) await _controller.load(preserveContent: true);
  }

  Future<void> _openShare() async {
    final detail = _controller.detail;
    if (detail == null) return;
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => BinderShareSettingsScreen(
          detail: detail,
          repository: _repository,
          featureFlags: widget.featureFlags,
        ),
      ),
    );
    if (changed == true) await _controller.load(preserveContent: true);
  }

  Future<void> _reportContribution(String contributionId) async {
    final reason = await showBinderReportReasonPicker(
      context,
      subjectLabel: 'this contribution',
    );
    if (reason == null) return;
    final ok = await _controller.mutate(
      () => _repository.report(
        surface: BinderReportSurface.contribution,
        surfaceId: contributionId,
        reason: reason.wireValue,
      ),
    );
    if (!ok) {
      _showFailure();
    } else if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Report submitted.')));
    }
  }

  Future<void> _blockContributionMember(String memberId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Block this Binder member?'),
        content: const Text(
          'The server applies the lawful Binder relationship changes without '
          'exposing an account or Vault identifier.',
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
    final ok = await _controller.mutate(
      () => _repository.blockMember(memberId),
    );
    if (!ok) _showFailure();
  }

  @override
  Widget build(BuildContext context) {
    final detail = _controller.detail;
    return Scaffold(
      appBar: AppBar(
        title: Text(detail?.summary.title ?? 'Binder'),
        actions: [
          if (detail?.permissions.canShare ?? false)
            IconButton(
              tooltip: 'Share or invite',
              onPressed: _openShare,
              icon: const Icon(Icons.ios_share_rounded),
            ),
          IconButton(
            tooltip: 'Refresh Binder',
            onPressed: () => _controller.load(preserveContent: true),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (!widget.featureFlags.personalAvailable) {
      return const BinderStateMessage(
        icon: Icons.lock_clock_outlined,
        title: 'Binders are not enabled',
        body: 'No Binder or Vault data was changed.',
      );
    }
    if (_controller.status == BinderLoadStatus.loading &&
        _controller.detail == null) {
      return const Center(child: CircularProgressIndicator.adaptive());
    }
    if (_controller.status == BinderLoadStatus.failed ||
        _controller.detail == null) {
      final failure = _controller.error;
      return BinderStateMessage(
        icon: failure?.kind == BinderFailureKind.noAccess
            ? Icons.lock_outline_rounded
            : Icons.cloud_off_outlined,
        title: failure?.kind == BinderFailureKind.noAccess
            ? 'Binder unavailable'
            : 'Unable to load Binder',
        body: failure?.message ?? 'Try again.',
        action: FilledButton.icon(
          onPressed: _controller.load,
          icon: const Icon(Icons.refresh_rounded),
          label: const Text('Try again'),
        ),
      );
    }

    final detail = _controller.detail!;
    final canSettings =
        detail.permissions.canEdit ||
        detail.permissions.canManagePolicy ||
        detail.permissions.canArchive ||
        detail.permissions.canLeave ||
        detail.membershipState == BinderMembershipState.active;
    final tabCount = canSettings ? 4 : 3;
    return DefaultTabController(
      key: ValueKey('binder-tabs-$tabCount'),
      length: tabCount,
      child: Column(
        children: [
          _BinderDetailHeader(detail: detail),
          if (detail.summary.lifecycle == BinderLifecycle.archived)
            Material(
              color: Theme.of(context).colorScheme.surfaceContainerHigh,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 12, 8),
                child: Row(
                  children: [
                    const Icon(Icons.archive_outlined),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'This Binder is archived. Collaboration is read-only.',
                      ),
                    ),
                    if (detail.permissions.canArchive)
                      TextButton(
                        onPressed: _controller.mutationBusy
                            ? null
                            : () async {
                                final ok = await _controller.mutate(
                                  () => _repository.setLifecycle(
                                    publicId: widget.publicId,
                                    lifecycle: BinderLifecycle.active,
                                  ),
                                );
                                if (!ok) _showFailure();
                              },
                        child: const Text('Restore'),
                      ),
                  ],
                ),
              ),
            ),
          TabBar(
            isScrollable: true,
            onTap: (index) {
              if (index == 1) unawaited(_controller.loadActivity());
              if (index == 2) unawaited(_controller.loadMembers());
            },
            tabs: [
              const Tab(text: 'Checklist'),
              const Tab(text: 'Activity'),
              const Tab(text: 'Members'),
              if (canSettings) const Tab(text: 'Settings'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _BinderChecklistTab(
                  controller: _controller,
                  onAddCopy: detail.permissions.canAddCopy
                      ? _openAddCopy
                      : null,
                  onBulkAdd:
                      detail.permissions.canAddCopy &&
                          detail.summary.lifecycle == BinderLifecycle.active
                      ? _openBulk
                      : null,
                  onWithdraw: (contributionId) async {
                    final ok = await _controller.mutate(
                      () => _repository.withdrawContribution(contributionId),
                    );
                    if (!ok) _showFailure();
                  },
                  onDecide: (contributionId, approve) async {
                    final ok = await _controller.mutate(
                      () => _repository.decideContribution(
                        contributionId: contributionId,
                        approve: approve,
                      ),
                    );
                    if (!ok) _showFailure();
                  },
                  onRemove: (contributionId) async {
                    final ok = await _controller.mutate(
                      () => _repository.removeContribution(
                        contributionId: contributionId,
                        reason: 'Removed by Binder management',
                      ),
                    );
                    if (!ok) _showFailure();
                  },
                  onReport: _reportContribution,
                  onBlockMember: _blockContributionMember,
                ),
                _BinderActivityTab(controller: _controller),
                _BinderMembersTab(
                  detail: detail,
                  controller: _controller,
                  repository: _repository,
                  onFailure: _showFailure,
                ),
                if (canSettings)
                  _BinderSettingsTab(
                    detail: detail,
                    controller: _controller,
                    repository: _repository,
                    flags: widget.featureFlags,
                    onShare: _openShare,
                    onFailure: _showFailure,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BinderDetailHeader extends StatelessWidget {
  const _BinderDetailHeader({required this.detail});

  final BinderDetail detail;

  @override
  Widget build(BuildContext context) {
    final binder = detail.summary;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          BinderArtwork(imageUrl: binder.coverImageUrl, size: 70),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  binder.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (binder.targetLabel.isNotEmpty) binder.targetLabel,
                    binder.checklistMode.label,
                    binder.readAccess.label,
                    '${binder.memberCount} ${binder.memberCount == 1 ? 'member' : 'members'}',
                  ].join(' · '),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 10),
                BinderProgressBar(
                  completed: binder.completedSlots,
                  total: binder.totalSlots,
                  unit: binder.effectiveProgressUnit,
                  compact: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BinderChecklistTab extends StatelessWidget {
  const _BinderChecklistTab({
    required this.controller,
    required this.onAddCopy,
    required this.onBulkAdd,
    required this.onWithdraw,
    required this.onDecide,
    required this.onRemove,
    required this.onReport,
    required this.onBlockMember,
  });

  final BinderDetailController controller;
  final VoidCallback? onAddCopy;
  final VoidCallback? onBulkAdd;
  final ValueChanged<String> onWithdraw;
  final void Function(String contributionId, bool approve) onDecide;
  final ValueChanged<String> onRemove;
  final ValueChanged<String> onReport;
  final ValueChanged<String> onBlockMember;

  @override
  Widget build(BuildContext context) {
    final items = controller.checklist.items;
    return RefreshIndicator(
      onRefresh: () => controller.load(preserveContent: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 30),
        children: [
          const BinderVaultBoundaryNotice(),
          if (onAddCopy != null || onBulkAdd != null) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (onAddCopy != null)
                  FilledButton.icon(
                    onPressed: controller.mutationBusy ? null : onAddCopy,
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('Add your copy'),
                  ),
                if (onBulkAdd != null)
                  OutlinedButton.icon(
                    onPressed: controller.mutationBusy ? null : onBulkAdd,
                    icon: const Icon(Icons.playlist_add_check_rounded),
                    label: const Text('Add matching Vault copies'),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final filter in BinderChecklistFilter.values)
                  Padding(
                    padding: const EdgeInsets.only(right: 7),
                    child: FilterChip(
                      selected: controller.checklistFilter == filter,
                      label: Text(filter.label),
                      onSelected: (_) => controller.setChecklistFilter(filter),
                    ),
                  ),
              ],
            ),
          ),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 44),
              child: BinderStateMessage(
                icon: Icons.checklist_rounded,
                title: 'No checklist slots here',
                body: 'Try another filter or refresh this Binder.',
              ),
            )
          else
            for (final item in items)
              _BinderChecklistTile(
                item: item,
                canApprove: controller.detail?.permissions.canApprove ?? false,
                onAddCopy: onAddCopy,
                onWithdraw: onWithdraw,
                onDecide: onDecide,
                onRemove: onRemove,
                onReport: onReport,
                onBlockMember: onBlockMember,
              ),
          if (controller.checklist.hasMore)
            OutlinedButton(
              onPressed: controller.loadMoreChecklist,
              child: const Text('Load more checklist slots'),
            ),
        ],
      ),
    );
  }
}

class _BinderChecklistTile extends StatelessWidget {
  const _BinderChecklistTile({
    required this.item,
    required this.canApprove,
    required this.onAddCopy,
    required this.onWithdraw,
    required this.onDecide,
    required this.onRemove,
    required this.onReport,
    required this.onBlockMember,
  });

  final BinderChecklistItem item;
  final bool canApprove;
  final VoidCallback? onAddCopy;
  final ValueChanged<String> onWithdraw;
  final void Function(String contributionId, bool approve) onDecide;
  final ValueChanged<String> onRemove;
  final ValueChanged<String> onReport;
  final ValueChanged<String> onBlockMember;

  @override
  Widget build(BuildContext context) {
    final subtitle = <String>[
      if ((item.setLabel ?? '').isNotEmpty) item.setLabel!,
      if ((item.number ?? '').isNotEmpty) '#${item.number}',
      if ((item.finishLabel ?? '').isNotEmpty) item.finishLabel!,
      '${item.activeQuantity}/${item.requiredQuantity} linked',
      if (item.pendingCount > 0) '${item.pendingCount} pending',
    ];
    final canAddCopyToSlot = onAddCopy != null && item.hasEligibleCopy;
    final hasReportAction = item.contributions.any(
      (contribution) =>
          contribution.canReport &&
          contribution.effectiveReportReference != null,
    );
    final hasBlockAction = item.contributions.any(
      (contribution) =>
          contribution.canBlockMember &&
          contribution.effectiveBlockReference != null,
    );
    final hasRowActions =
        canAddCopyToSlot ||
        item.ownContributionIds.isNotEmpty ||
        (canApprove && item.pendingContributionIds.isNotEmpty) ||
        item.removableContributionIds.isNotEmpty ||
        hasReportAction ||
        hasBlockAction;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          children: [
            BinderArtwork(
              imageUrl: item.imageUrl,
              size: 54,
              icon: Icons.style_outlined,
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        item.isSatisfied
                            ? Icons.check_circle_rounded
                            : item.needsReview
                            ? Icons.help_rounded
                            : Icons.radio_button_unchecked_rounded,
                        size: 18,
                        color: item.isSatisfied
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          item.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle.join(' · '),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  if (item.attributionLabels.isNotEmpty)
                    Text(
                      item.attributionLabels.join(', '),
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                ],
              ),
            ),
            if (hasRowActions)
              PopupMenuButton<String>(
                tooltip: 'Checklist slot actions',
                onSelected: (value) {
                  if (value == 'add') onAddCopy?.call();
                  if (value.startsWith('withdraw:')) {
                    onWithdraw(value.substring('withdraw:'.length));
                  }
                  if (value.startsWith('approve:')) {
                    onDecide(value.substring('approve:'.length), true);
                  }
                  if (value.startsWith('reject:')) {
                    onDecide(value.substring('reject:'.length), false);
                  }
                  if (value.startsWith('remove:')) {
                    onRemove(value.substring('remove:'.length));
                  }
                  if (value.startsWith('report:')) {
                    onReport(value.substring('report:'.length));
                  }
                  if (value.startsWith('block:')) {
                    onBlockMember(value.substring('block:'.length));
                  }
                },
                itemBuilder: (_) => [
                  if (canAddCopyToSlot)
                    const PopupMenuItem(
                      value: 'add',
                      child: Text('Add your copy'),
                    ),
                  for (final id in item.ownContributionIds)
                    PopupMenuItem(
                      value: 'withdraw:$id',
                      child: const Text('Withdraw your copy'),
                    ),
                  if (canApprove)
                    for (final id in item.pendingContributionIds) ...[
                      PopupMenuItem(
                        value: 'approve:$id',
                        child: const Text('Approve contribution'),
                      ),
                      PopupMenuItem(
                        value: 'reject:$id',
                        child: const Text('Reject contribution'),
                      ),
                    ],
                  for (final id in item.removableContributionIds)
                    PopupMenuItem(
                      value: 'remove:$id',
                      child: const Text('Remove contribution'),
                    ),
                  for (final contribution in item.contributions)
                    if (contribution.canReport &&
                        contribution.effectiveReportReference != null)
                      PopupMenuItem(
                        value:
                            'report:${contribution.effectiveReportReference!}',
                        child: Text(
                          (contribution.memberLabel ?? '').isEmpty
                              ? 'Report contribution'
                              : 'Report ${contribution.memberLabel}’s contribution',
                        ),
                      ),
                  for (final contribution in item.contributions)
                    if (contribution.canBlockMember &&
                        contribution.effectiveBlockReference != null)
                      PopupMenuItem(
                        value: 'block:${contribution.effectiveBlockReference!}',
                        child: Text(
                          (contribution.memberLabel ?? '').isEmpty
                              ? 'Block member'
                              : 'Block ${contribution.memberLabel}',
                        ),
                      ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _BinderActivityTab extends StatelessWidget {
  const _BinderActivityTab({required this.controller});

  final BinderDetailController controller;

  @override
  Widget build(BuildContext context) {
    if (!controller.activityLoaded) {
      return const Center(child: CircularProgressIndicator.adaptive());
    }
    if (controller.activity.items.isEmpty) {
      return const BinderStateMessage(
        icon: Icons.history_rounded,
        title: 'No one has added a card yet',
        body: 'Binder activity will appear here.',
      );
    }
    return RefreshIndicator(
      onRefresh: () => controller.loadActivity(refresh: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        children: [
          for (final event in controller.activity.items)
            ListTile(
              leading: Icon(
                event.isSystem
                    ? Icons.settings_suggest_outlined
                    : Icons.history,
              ),
              title: Text(event.message),
              subtitle: Text(
                [
                  if ((event.actorLabel ?? '').isNotEmpty) event.actorLabel,
                  _formatDateTime(event.createdAt),
                ].whereType<String>().join(' · '),
              ),
            ),
          if (controller.activity.hasMore)
            OutlinedButton(
              onPressed: controller.loadingMoreActivity
                  ? null
                  : controller.loadMoreActivity,
              child: Text(
                controller.loadingMoreActivity
                    ? 'Loading…'
                    : 'Load more activity',
              ),
            ),
        ],
      ),
    );
  }
}

class _BinderMembersTab extends StatelessWidget {
  const _BinderMembersTab({
    required this.detail,
    required this.controller,
    required this.repository,
    required this.onFailure,
  });

  final BinderDetail detail;
  final BinderDetailController controller;
  final BinderRepository repository;
  final VoidCallback onFailure;

  Future<void> _mutate(Future<void> Function() action) async {
    final ok = await controller.mutate(action);
    await controller.loadMembers(refresh: true);
    if (!ok) onFailure();
  }

  @override
  Widget build(BuildContext context) {
    if (!controller.membersLoaded) {
      return const Center(child: CircularProgressIndicator.adaptive());
    }
    final members = controller.members.items;
    return RefreshIndicator(
      onRefresh: () => controller.loadMembers(refresh: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        children: [
          if (detail.permissions.canInvite)
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => BinderInvitePeopleScreen(
                    publicId: detail.summary.publicId,
                    viewerRole: detail.summary.role,
                    repository: repository,
                  ),
                ),
              ),
              icon: const Icon(Icons.person_add_alt_1_rounded),
              label: const Text('Invite people'),
            ),
          if (detail.permissions.canApprove ||
              detail.permissions.canManageMembers) ...[
            const SizedBox(height: 8),
            OutlinedButton.icon(
              key: const ValueKey('binder-open-moderation-queue'),
              onPressed: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => BinderModerationQueueScreen(
                      publicId: detail.summary.publicId,
                      repository: repository,
                    ),
                  ),
                );
                await controller.load(preserveContent: true);
                await controller.loadMembers(refresh: true);
              },
              icon: const Icon(Icons.fact_check_outlined),
              label: Text(
                detail.pendingJoinRequestCount > 0 ||
                        detail.summary.pendingApprovalCount > 0
                    ? 'Review ${detail.summary.pendingApprovalCount} cards '
                          'and ${detail.pendingJoinRequestCount} join requests'
                    : 'Open review queue',
              ),
            ),
          ],
          if (detail.pendingJoinRequests.isNotEmpty) ...[
            const SizedBox(height: 18),
            Text(
              'Join requests',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            for (final request in detail.pendingJoinRequests)
              ListTile(
                title: Text(request.requesterLabel ?? 'Collector'),
                subtitle: Text(
                  'Requests ${request.requestedRole.label} access',
                ),
                trailing: Wrap(
                  children: [
                    IconButton(
                      tooltip: 'Reject join request',
                      onPressed: () => _mutate(
                        () => repository.decideJoinRequest(
                          requestId: request.id,
                          approve: false,
                        ),
                      ),
                      icon: const Icon(Icons.close_rounded),
                    ),
                    IconButton(
                      tooltip: 'Approve join request',
                      onPressed: () => _mutate(
                        () => repository.decideJoinRequest(
                          requestId: request.id,
                          approve: true,
                        ),
                      ),
                      icon: const Icon(Icons.check_rounded),
                    ),
                  ],
                ),
              ),
          ],
          if (detail.pendingInvitations.isNotEmpty) ...[
            const SizedBox(height: 18),
            Text(
              'Pending invitations',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            for (final invitation in detail.pendingInvitations)
              ListTile(
                title: Text(
                  invitation.isAccountTargeted
                      ? 'Account-targeted invitation'
                      : 'One-use invitation',
                ),
                subtitle: Text(
                  '${invitation.maximumRole.label}'
                  '${invitation.expiresAt == null ? '' : ' · expires ${_formatDateTime(invitation.expiresAt!)}'}',
                ),
                trailing: detail.permissions.canInvite
                    ? TextButton(
                        onPressed: () => _mutate(
                          () => repository.revokeInvitation(invitation.id),
                        ),
                        child: const Text('Revoke'),
                      )
                    : null,
              ),
          ],
          const SizedBox(height: 12),
          if (members.isEmpty)
            const BinderStateMessage(
              icon: Icons.group_outlined,
              title: 'No member list available',
              body: 'Refresh to check current Binder access.',
            )
          else
            for (final member in members)
              ListTile(
                leading: CircleAvatar(
                  child: Text(
                    member.displayLabel.isEmpty
                        ? 'B'
                        : member.displayLabel.characters.first.toUpperCase(),
                  ),
                ),
                title: Text(member.displayLabel),
                subtitle: Text(
                  '${member.role.label} · ${member.state.wireValue}'
                  '${member.activeContributionCount > 0 ? ' · ${member.activeContributionCount} copies' : ''}',
                ),
                trailing: !member.isCurrentUser
                    ? PopupMenuButton<String>(
                        tooltip: 'Actions for ${member.displayLabel}',
                        onSelected: (value) async {
                          if (value.startsWith('role:')) {
                            final role = BinderRole.parse(
                              value.substring('role:'.length),
                            );
                            await _mutate(
                              () => repository.changeMemberRole(
                                memberId: member.membershipId,
                                role: role,
                              ),
                            );
                          } else if (value == 'suspend') {
                            await _mutate(
                              () => repository.suspendMember(
                                memberId: member.membershipId,
                                reason: 'Binder moderation',
                              ),
                            );
                          } else if (value == 'reinstate') {
                            await _mutate(
                              () => repository.reinstateMember(
                                member.membershipId,
                              ),
                            );
                          } else if (value == 'remove') {
                            await _mutate(
                              () => repository.removeMember(
                                memberId: member.membershipId,
                                reason: 'Removed by Binder management',
                              ),
                            );
                          } else if (value == 'block') {
                            final confirmed = await showDialog<bool>(
                              context: context,
                              builder: (context) => AlertDialog(
                                title: Text('Block ${member.displayLabel}?'),
                                content: const Text(
                                  'Blocking changes direct interaction, but '
                                  'cannot be used to evade Binder moderation. '
                                  'The server applies the lawful relationship '
                                  'effect without exposing an account ID.',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(context, false),
                                    child: const Text('Cancel'),
                                  ),
                                  FilledButton(
                                    onPressed: () =>
                                        Navigator.pop(context, true),
                                    child: const Text('Block'),
                                  ),
                                ],
                              ),
                            );
                            if (confirmed == true) {
                              await _mutate(
                                () =>
                                    repository.blockMember(member.membershipId),
                              );
                            }
                          } else if (value == 'report') {
                            final reason = await showBinderReportReasonPicker(
                              context,
                              subjectLabel: 'this member',
                            );
                            if (reason != null) {
                              await _mutate(
                                () => repository.report(
                                  surface: BinderReportSurface.member,
                                  surfaceId: member.membershipId,
                                  reason: reason.wireValue,
                                ),
                              );
                            }
                          }
                        },
                        itemBuilder: (_) => [
                          if (detail.permissions.canManageMembers &&
                              detail.summary.role == BinderRole.owner &&
                              member.role != BinderRole.owner)
                            for (final role in const [
                              BinderRole.manager,
                              BinderRole.contributor,
                              BinderRole.viewer,
                            ])
                              PopupMenuItem(
                                value: 'role:${role.wireValue}',
                                child: Text('Make ${role.label}'),
                              ),
                          if (detail.permissions.canManageMembers &&
                              member.role != BinderRole.owner &&
                              member.state == BinderMembershipState.active)
                            const PopupMenuItem(
                              value: 'suspend',
                              child: Text('Suspend'),
                            ),
                          if (detail.permissions.canManageMembers &&
                              member.role != BinderRole.owner &&
                              member.state == BinderMembershipState.suspended)
                            const PopupMenuItem(
                              value: 'reinstate',
                              child: Text('Reinstate'),
                            ),
                          if (detail.permissions.canManageMembers &&
                              member.role != BinderRole.owner)
                            const PopupMenuItem(
                              value: 'remove',
                              child: Text('Remove from Binder'),
                            ),
                          const PopupMenuItem(
                            value: 'report',
                            child: Text('Report member'),
                          ),
                          const PopupMenuItem(
                            value: 'block',
                            child: Text('Block member'),
                          ),
                        ],
                      )
                    : null,
              ),
          if (controller.members.hasMore)
            OutlinedButton(
              onPressed: controller.loadingMoreMembers
                  ? null
                  : controller.loadMoreMembers,
              child: Text(
                controller.loadingMoreMembers
                    ? 'Loading…'
                    : 'Load more members',
              ),
            ),
        ],
      ),
    );
  }
}

class _BinderSettingsTab extends StatefulWidget {
  const _BinderSettingsTab({
    required this.detail,
    required this.controller,
    required this.repository,
    required this.flags,
    required this.onShare,
    required this.onFailure,
  });

  final BinderDetail detail;
  final BinderDetailController controller;
  final BinderRepository repository;
  final BinderFeatureFlags flags;
  final VoidCallback onShare;
  final VoidCallback onFailure;

  @override
  State<_BinderSettingsTab> createState() => _BinderSettingsTabState();
}

class _BinderSettingsTabState extends State<_BinderSettingsTab> {
  late final TextEditingController _aliasController = TextEditingController(
    text: widget.detail.alias ?? '',
  );
  late BinderConsentScope _contentScope = widget.detail.contentConsent;
  late BinderConsentScope _identityScope = widget.detail.identityConsent;
  late BinderReadAccess _readAccess = widget.detail.summary.readAccess;
  late BinderDiscoverability _discoverability =
      widget.detail.summary.discoverability;
  late BinderJoinPolicy _joinPolicy = widget.detail.summary.joinPolicy;
  late BinderContributionPolicy _contributionPolicy =
      widget.detail.summary.contributionPolicy;
  bool _auxiliaryBusy = false;

  bool get _consentWithdrawalOnly =>
      widget.detail.summary.lifecycle == BinderLifecycle.archived ||
      widget.detail.summary.moderationState == BinderModerationState.frozen;

  bool get _canEditCustomChecklist =>
      widget.flags.customBindersAvailable &&
      widget.detail.summary.role == BinderRole.owner &&
      widget.detail.summary.targetKind == BinderTargetKind.custom &&
      widget.detail.summary.lifecycle == BinderLifecycle.active &&
      widget.detail.summary.moderationState == BinderModerationState.clear;

  bool get _canSubmitTemplate =>
      _canEditCustomChecklist && widget.flags.templatesAvailable;

  bool get _canSharePulseMilestone {
    final detail = widget.detail;
    return widget.flags.pulseSharingAvailable &&
        detail.summary.role == BinderRole.owner &&
        detail.summary.lifecycle == BinderLifecycle.active &&
        detail.summary.moderationState == BinderModerationState.clear &&
        detail.summary.readAccess == BinderReadAccess.public &&
        detail.summary.discoverability == BinderDiscoverability.listed &&
        detail.externalTotalSlots > 0 &&
        detail.externalCompletionPercent >= 25;
  }

  @override
  void dispose() {
    _aliasController.dispose();
    super.dispose();
  }

  Future<void> _savePreferences() async {
    final withdrawalOnly = _consentWithdrawalOnly;
    final ok = await widget.controller.mutate(
      () => widget.repository.updateMemberPreferences(
        publicId: widget.detail.summary.publicId,
        alias: withdrawalOnly ? widget.detail.alias : _aliasController.text,
        contentScope: withdrawalOnly ? BinderConsentScope.none : _contentScope,
        identityScope: withdrawalOnly
            ? BinderConsentScope.none
            : _identityScope,
        notificationPreference: widget.detail.notificationPreference,
      ),
    );
    if (!ok) widget.onFailure();
  }

  Future<List<BinderChecklistItem>> _loadAllChecklistItems() async {
    final items = <BinderChecklistItem>[];
    BinderCursor? cursor;
    do {
      final page = await widget.repository.loadChecklist(
        publicId: widget.detail.summary.publicId,
        filter: BinderChecklistFilter.all,
        cursor: cursor,
        limit: 50,
      );
      items.addAll(page.items);
      cursor = page.hasMore && items.length < 1000 ? page.nextCursor : null;
    } while (cursor != null);
    return items.take(1000).toList(growable: false);
  }

  Future<List<BinderCustomSlotDraft>> _loadAllCustomSlots() async {
    final items = await _loadAllChecklistItems();
    return items
        .map(BinderCustomSlotDraft.fromChecklist)
        .toList(growable: false);
  }

  Future<void> _editCustomChecklist() async {
    if (_auxiliaryBusy || !_canEditCustomChecklist) return;
    setState(() => _auxiliaryBusy = true);
    try {
      final initial = await _loadAllCustomSlots();
      if (!mounted) return;
      final edited = await Navigator.of(context)
          .push<List<BinderCustomSlotDraft>>(
            MaterialPageRoute<List<BinderCustomSlotDraft>>(
              builder: (_) => BinderCustomChecklistEditorScreen(
                repository: widget.repository,
                initialSlots: initial,
              ),
            ),
          );
      if (edited == null || edited.isEmpty || !mounted) return;
      final confirmed = await showBinderCustomChecklistPreview(
        context,
        slots: edited,
        actionLabel: 'Publish revision',
      );
      if (!confirmed || !mounted) return;
      final ok = await widget.controller.mutate(
        () => widget.repository.publishCustomRevision(
          publicId: widget.detail.summary.publicId,
          slots: edited
              .map((slot) => slot.toWireJson())
              .toList(growable: false),
        ),
      );
      if (!ok) {
        widget.onFailure();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('New checklist revision published.')),
        );
      }
    } on BinderException catch (failure) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(failure.message)));
      }
    } finally {
      if (mounted) setState(() => _auxiliaryBusy = false);
    }
  }

  Future<void> _submitTemplate() async {
    if (_auxiliaryBusy || !_canSubmitTemplate) return;
    final nameController = TextEditingController(
      text: widget.detail.summary.title,
    );
    final descriptionController = TextEditingController(
      text: widget.detail.summary.description,
    );
    final submit = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Submit as a Template'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Only the versioned checklist definition is submitted for '
                'moderation. Members, contributions, activity, and private '
                'Binder settings are never included.',
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameController,
                maxLength: 80,
                decoration: const InputDecoration(labelText: 'Template name'),
              ),
              TextField(
                controller: descriptionController,
                maxLength: 1000,
                minLines: 2,
                maxLines: 5,
                decoration: const InputDecoration(
                  labelText: 'Template description',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Submit for review'),
          ),
        ],
      ),
    );
    final name = nameController.text.trim();
    final description = descriptionController.text.trim();
    nameController.dispose();
    descriptionController.dispose();
    if (submit != true || name.isEmpty || !mounted) return;
    setState(() => _auxiliaryBusy = true);
    try {
      await widget.repository.submitTemplate(
        publicId: widget.detail.summary.publicId,
        name: name,
        description: description,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Template submitted for moderation review.'),
          ),
        );
      }
    } on BinderException catch (failure) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(failure.message)));
      }
    } finally {
      if (mounted) setState(() => _auxiliaryBusy = false);
    }
  }

  Future<void> _sharePulseMilestone() async {
    if (_auxiliaryBusy || !_canSharePulseMilestone) return;
    final detail = widget.detail;
    final reached = const <int>[25, 50, 75, 90, 100]
        .where((threshold) => threshold <= detail.externalCompletionPercent)
        .toList(growable: false);
    var selected = reached.last;
    final threshold = await showDialog<int>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Share milestone to Pulse?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                detail.summary.title,
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              BinderProgressBar(
                completed: detail.externalCompletedSlots,
                total: detail.externalTotalSlots,
                unit: detail.externalProgressUnit,
                compact: true,
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<int>(
                initialValue: selected,
                decoration: const InputDecoration(labelText: 'Milestone'),
                items: [
                  for (final value in reached)
                    DropdownMenuItem(
                      value: value,
                      child: Text('$value% complete'),
                    ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setDialogState(() => selected = value);
                  }
                },
              ),
              const SizedBox(height: 10),
              const Text(
                'Pulse receives this public Binder title and public progress '
                'milestone only. This does not share Vault data.',
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, selected),
              child: const Text('Share to Pulse'),
            ),
          ],
        ),
      ),
    );
    if (threshold == null || !mounted) return;
    setState(() => _auxiliaryBusy = true);
    try {
      final result = await widget.repository.sharePulseMilestone(
        publicId: detail.summary.publicId,
        threshold: threshold,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.alreadyShared
                  ? 'That milestone was already shared to Pulse.'
                  : '${result.threshold}% milestone shared to Pulse.',
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
    } finally {
      if (mounted) setState(() => _auxiliaryBusy = false);
    }
  }

  bool get _policyIsValid {
    if (_discoverability == BinderDiscoverability.listed &&
        _readAccess != BinderReadAccess.public) {
      return false;
    }
    if (_readAccess != BinderReadAccess.public &&
        _discoverability != BinderDiscoverability.unlisted) {
      return false;
    }
    if (_joinPolicy == BinderJoinPolicy.requestToJoin) {
      return _readAccess == BinderReadAccess.public &&
          _discoverability == BinderDiscoverability.listed &&
          _contributionPolicy == BinderContributionPolicy.approvalRequired;
    }
    return true;
  }

  Future<void> _savePolicy() async {
    if (!_policyIsValid) return;
    final ok = await widget.controller.mutate(
      () => widget.repository.updatePolicy(
        publicId: widget.detail.summary.publicId,
        readAccess: _readAccess,
        discoverability: _discoverability,
        joinPolicy: _joinPolicy,
        contributionPolicy: _contributionPolicy,
      ),
    );
    if (!ok) widget.onFailure();
  }

  Future<void> _editMetadata() async {
    if (_auxiliaryBusy) return;
    setState(() => _auxiliaryBusy = true);
    List<BinderChecklistItem> checklist;
    try {
      checklist = await _loadAllChecklistItems();
    } on BinderException catch (failure) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(failure.message)));
      }
      if (mounted) setState(() => _auxiliaryBusy = false);
      return;
    }
    if (!mounted) return;
    setState(() => _auxiliaryBusy = false);
    final title = TextEditingController(text: widget.detail.summary.title);
    final description = TextEditingController(
      text: widget.detail.summary.description,
    );
    final requiresHostedCover =
        widget.detail.summary.targetKind == BinderTargetKind.custom ||
        (widget.detail.summary.readAccess == BinderReadAccess.public &&
            widget.detail.summary.discoverability ==
                BinderDiscoverability.listed);
    final candidatesByCard = <String, BinderChecklistItem>{};
    for (final item in checklist) {
      if (item.cardPrintId.isEmpty ||
          (requiresHostedCover && !item.hasHostedImage)) {
        continue;
      }
      final existing = candidatesByCard[item.cardPrintId];
      if (existing == null ||
          (!existing.hasHostedImage && item.hasHostedImage)) {
        candidatesByCard[item.cardPrintId] = item;
      }
    }
    final coverCandidates = candidatesByCard.values.toList(growable: false)
      ..sort((left, right) {
        final byName = left.name.compareTo(right.name);
        if (byName != 0) return byName;
        return (left.number ?? '').compareTo(right.number ?? '');
      });
    final currentCover = widget.detail.coverCardPrintId ?? '';
    var selectedCover = currentCover;
    final currentIsCandidate = coverCandidates.any(
      (item) => item.cardPrintId == currentCover,
    );
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          final selectionIsEligible =
              selectedCover.isEmpty ||
              coverCandidates.any(
                (item) => item.cardPrintId == selectedCover,
              ) ||
              !requiresHostedCover;
          return AlertDialog(
            title: const Text('Edit Binder details'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: title,
                    maxLength: 80,
                    decoration: const InputDecoration(labelText: 'Title'),
                  ),
                  TextField(
                    controller: description,
                    maxLength: 1000,
                    minLines: 2,
                    maxLines: 5,
                    decoration: const InputDecoration(labelText: 'Description'),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    key: ValueKey('binder-cover-$selectedCover'),
                    initialValue: selectedCover,
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: 'Binder cover',
                      helperText: requiresHostedCover
                          ? 'Public, listed, and custom Binders use verified '
                                'Grookai-hosted artwork only.'
                          : 'Choose a governed card from this checklist.',
                      errorText: selectionIsEligible
                          ? null
                          : 'Choose a Grookai-hosted card or explicitly '
                                'choose No cover.',
                    ),
                    items: <DropdownMenuItem<String>>[
                      const DropdownMenuItem<String>(
                        value: '',
                        child: Text('No cover'),
                      ),
                      if (currentCover.isNotEmpty && !currentIsCandidate)
                        DropdownMenuItem<String>(
                          value: currentCover,
                          enabled: !requiresHostedCover,
                          child: Text(
                            requiresHostedCover
                                ? 'Current cover needs replacement'
                                : 'Keep current cover',
                          ),
                        ),
                      for (final item in coverCandidates)
                        DropdownMenuItem<String>(
                          value: item.cardPrintId,
                          child: Text(
                            [
                              item.name,
                              if ((item.number ?? '').isNotEmpty)
                                '#${item.number}',
                              if (item.hasHostedImage) 'Grookai hosted',
                            ].join(' · '),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setDialogState(() => selectedCover = value);
                      }
                    },
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: selectionIsEligible
                    ? () => Navigator.pop(context, true)
                    : null,
                child: const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
    if (save == true) {
      final ok = await widget.controller.mutate(
        () => widget.repository.updateMetadata(
          publicId: widget.detail.summary.publicId,
          title: title.text,
          description: description.text,
          coverCardPrintId: selectedCover.isEmpty ? null : selectedCover,
        ),
      );
      if (!ok) widget.onFailure();
    }
    title.dispose();
    description.dispose();
  }

  Future<void> _archiveOrRestore() async {
    final archived =
        widget.detail.summary.lifecycle == BinderLifecycle.archived;
    final ok = await widget.controller.mutate(
      () => widget.repository.setLifecycle(
        publicId: widget.detail.summary.publicId,
        lifecycle: archived ? BinderLifecycle.active : BinderLifecycle.archived,
      ),
    );
    if (!ok) widget.onFailure();
  }

  Future<void> _leave() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave this Binder?'),
        content: const Text(
          'Your live contributions will be withdrawn. Your Vault copies '
          'will not be changed or deleted.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Leave Binder'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await widget.repository.leaveBinder(widget.detail.summary.publicId);
      if (mounted) Navigator.of(context).pop();
    } on BinderException {
      widget.onFailure();
    }
  }

  Future<void> _delete() async {
    final requiredConfirmation = binderDeleteConfirmation(
      widget.detail.summary.title,
    );
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => _BinderDeleteConfirmationDialog(
        requiredConfirmation: requiredConfirmation,
      ),
    );
    if (confirmed != true) return;
    try {
      await widget.repository.deleteBinder(
        publicId: widget.detail.summary.publicId,
        confirmation: requiredConfirmation,
      );
      if (mounted) Navigator.of(context).pop();
    } on BinderException {
      widget.onFailure();
    }
  }

  Future<void> _respondTransfer(bool accept) async {
    final offer = widget.detail.ownerTransferOffer;
    if (offer == null) return;
    final ok = await widget.controller.mutate(
      () => accept
          ? widget.repository.acceptOwnerTransfer(offer.id)
          : widget.repository.revokeOwnerTransfer(offer.id),
    );
    if (!ok) widget.onFailure();
  }

  @override
  Widget build(BuildContext context) {
    final detail = widget.detail;
    final transferActionsAllowed =
        detail.summary.lifecycle == BinderLifecycle.active ||
        detail.summary.lifecycle == BinderLifecycle.archived;
    final transferModerationAllowsActions =
        detail.summary.moderationState != BinderModerationState.frozen &&
        detail.summary.moderationState != BinderModerationState.removed;
    final canActOnTransfer =
        transferActionsAllowed && transferModerationAllowsActions;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (detail.ownerTransferOffer?.isTargetViewer == true)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ownership transfer offered',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    detail
                            .ownerTransferOffer!
                            .formerOwnerDisposition
                            .leavesBinder
                        ? 'Accept to become Owner. The current Owner remains '
                              'in control until acceptance, then leaves the '
                              'Binder and withdraws their live contributions. '
                              'Vault copies remain unchanged.'
                        : 'Accept to become Owner. The current Owner remains '
                              'in control until acceptance and will become '
                              '${detail.ownerTransferOffer!.formerOwnerDisposition.label}.',
                  ),
                  const SizedBox(height: 10),
                  if (canActOnTransfer)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: widget.controller.mutationBusy
                              ? null
                              : () => _respondTransfer(false),
                          child: const Text('Decline'),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          onPressed: widget.controller.mutationBusy
                              ? null
                              : () => _respondTransfer(true),
                          child: const Text('Accept ownership'),
                        ),
                      ],
                    )
                  else
                    const Padding(
                      padding: EdgeInsets.only(top: 10),
                      child: Text(
                        'Transfer actions are unavailable while this Binder '
                        'is frozen or removed.',
                      ),
                    ),
                ],
              ),
            ),
          ),
        if (detail.ownerTransferOffer != null &&
            detail.ownerTransferOffer?.isTargetViewer != true)
          Card(
            child: ListTile(
              leading: const Icon(Icons.swap_horiz_rounded),
              title: const Text('Ownership transfer pending'),
              subtitle: Text(
                canActOnTransfer && detail.permissions.canTransfer
                    ? 'The selected member must accept before ownership '
                          'changes.'
                    : 'Transfer actions are currently unavailable.',
              ),
              trailing: canActOnTransfer && detail.permissions.canTransfer
                  ? TextButton(
                      onPressed: widget.controller.mutationBusy
                          ? null
                          : () => _respondTransfer(false),
                      child: const Text('Revoke offer'),
                    )
                  : null,
            ),
          ),
        if (detail.permissions.canEdit)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.edit_outlined),
            title: const Text('Title and description'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: _editMetadata,
          ),
        if (detail.permissions.canShare)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.ios_share_rounded),
            title: const Text('Sharing and invitations'),
            subtitle: Text(detail.summary.readAccess.label),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: widget.onShare,
          ),
        if (detail.permissions.canApprove ||
            detail.permissions.canManageMembers)
          ListTile(
            key: const ValueKey('binder-settings-moderation-queue'),
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.fact_check_outlined),
            title: const Text('Review queue'),
            subtitle: Text(
              '${detail.summary.pendingApprovalCount} card contributions · '
              '${detail.pendingJoinRequestCount} join requests',
            ),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () async {
              await Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => BinderModerationQueueScreen(
                    publicId: detail.summary.publicId,
                    repository: widget.repository,
                  ),
                ),
              );
              await widget.controller.load(preserveContent: true);
            },
          ),
        if (_canEditCustomChecklist)
          ListTile(
            key: const ValueKey('binder-publish-custom-revision'),
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.tune_rounded),
            title: const Text('Edit custom checklist'),
            subtitle: Text(
              'Publish revision ${detail.definitionRevision + 1} after review',
            ),
            trailing: _auxiliaryBusy
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.chevron_right_rounded),
            onTap: _auxiliaryBusy ? null : _editCustomChecklist,
          ),
        if (_canSubmitTemplate)
          ListTile(
            key: const ValueKey('binder-submit-template'),
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.dashboard_customize_outlined),
            title: const Text('Submit as a Template'),
            subtitle: const Text('Checklist definition only · moderated'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: _auxiliaryBusy ? null : _submitTemplate,
          ),
        if (_canSharePulseMilestone)
          ListTile(
            key: const ValueKey('binder-share-pulse-milestone'),
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.bolt_rounded),
            title: const Text('Share a milestone to Pulse'),
            subtitle: Text(
              '${detail.externalCompletionPercent}% public progress · '
              'preview required',
            ),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: _auxiliaryBusy ? null : _sharePulseMilestone,
          ),
        if (detail.permissions.canManagePolicy) ...[
          const Divider(),
          Text(
            'Access and collaboration',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 9),
          DropdownButtonFormField<BinderReadAccess>(
            initialValue: _readAccess,
            decoration: const InputDecoration(labelText: 'Read access'),
            items: BinderReadAccess.values
                .where(
                  (value) =>
                      value == BinderReadAccess.private ||
                      (value == BinderReadAccess.link &&
                          widget.flags.viewLinksAvailable) ||
                      (value == BinderReadAccess.public &&
                          widget.flags.publicAvailable),
                )
                .map(
                  (value) =>
                      DropdownMenuItem(value: value, child: Text(value.label)),
                )
                .toList(growable: false),
            onChanged: (value) {
              if (value != null) setState(() => _readAccess = value);
            },
          ),
          const SizedBox(height: 9),
          DropdownButtonFormField<BinderDiscoverability>(
            initialValue: _discoverability,
            decoration: const InputDecoration(labelText: 'Discoverability'),
            items: BinderDiscoverability.values
                .map(
                  (value) =>
                      DropdownMenuItem(value: value, child: Text(value.label)),
                )
                .toList(growable: false),
            onChanged: (value) {
              if (value != null) setState(() => _discoverability = value);
            },
          ),
          const SizedBox(height: 9),
          DropdownButtonFormField<BinderJoinPolicy>(
            initialValue: _joinPolicy,
            decoration: const InputDecoration(labelText: 'Joining'),
            items: BinderJoinPolicy.values
                .where(
                  (value) =>
                      value != BinderJoinPolicy.requestToJoin ||
                      widget.flags.communityAvailable,
                )
                .map(
                  (value) =>
                      DropdownMenuItem(value: value, child: Text(value.label)),
                )
                .toList(growable: false),
            onChanged: (value) {
              if (value != null) setState(() => _joinPolicy = value);
            },
          ),
          const SizedBox(height: 9),
          DropdownButtonFormField<BinderContributionPolicy>(
            initialValue: _contributionPolicy,
            decoration: const InputDecoration(labelText: 'New contributions'),
            items: BinderContributionPolicy.values
                .map(
                  (value) =>
                      DropdownMenuItem(value: value, child: Text(value.label)),
                )
                .toList(growable: false),
            onChanged: (value) {
              if (value != null) setState(() => _contributionPolicy = value);
            },
          ),
          if (!_policyIsValid)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Listed requires Public. Request to join also requires '
                'Listed and Approval required.',
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          const SizedBox(height: 10),
          FilledButton.tonal(
            onPressed: !_policyIsValid || widget.controller.mutationBusy
                ? null
                : _savePolicy,
            child: const Text('Save access settings'),
          ),
        ],
        const Divider(),
        if (detail.requiresConsentReview) ...[
          Card(
            color: Theme.of(context).colorScheme.tertiaryContainer,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Review what this Binder may share',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 5),
                  const Text(
                    'This Binder’s public sharing settings changed. Choose '
                    'card visibility and name attribution separately, then '
                    'save. Nothing is published from your Vault by default.',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
        ],
        Text(
          'Your Binder identity',
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 9),
        if (_consentWithdrawalOnly) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Sharing consent can only be withdrawn while this Binder '
                    'is archived or frozen.',
                  ),
                  const SizedBox(height: 7),
                  Text(
                    'Current card scope: ${detail.contentConsent.label}\n'
                    'Current alias scope: ${detail.identityConsent.label}',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          FilledButton.tonalIcon(
            key: const ValueKey('binder-withdraw-all-consent'),
            onPressed:
                widget.controller.mutationBusy ||
                    (detail.contentConsent == BinderConsentScope.none &&
                        detail.identityConsent == BinderConsentScope.none)
                ? null
                : _savePreferences,
            icon: const Icon(Icons.visibility_off_outlined),
            label: const Text('Withdraw all sharing consent'),
          ),
        ] else ...[
          TextField(
            controller: _aliasController,
            maxLength: 40,
            decoration: const InputDecoration(
              labelText: 'Binder display alias (optional)',
              helperText: 'This does not create or enable a public profile.',
            ),
          ),
          if (detail.summary.readAccess != BinderReadAccess.private) ...[
            const SizedBox(height: 8),
            DropdownButtonFormField<BinderConsentScope>(
              initialValue: _contentScope,
              decoration: const InputDecoration(
                labelText: 'Show your contributed cards to',
              ),
              items: BinderConsentScope.values
                  .map(
                    (scope) => DropdownMenuItem(
                      value: scope,
                      child: Text(scope.label),
                    ),
                  )
                  .toList(growable: false),
              onChanged: (value) {
                if (value != null) setState(() => _contentScope = value);
              },
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<BinderConsentScope>(
              initialValue: _identityScope,
              decoration: const InputDecoration(
                labelText: 'Show your Binder alias to',
              ),
              items: BinderConsentScope.values
                  .map(
                    (scope) => DropdownMenuItem(
                      value: scope,
                      child: Text(scope.label),
                    ),
                  )
                  .toList(growable: false),
              onChanged: (value) {
                if (value != null) setState(() => _identityScope = value);
              },
            ),
            const SizedBox(height: 6),
            const Text(
              'Card visibility and name attribution are separate choices. '
              'Private Vault details are never included.',
            ),
          ],
          const SizedBox(height: 12),
          FilledButton.tonal(
            onPressed: widget.controller.mutationBusy ? null : _savePreferences,
            child: const Text('Save your Binder preferences'),
          ),
        ],
        const Divider(height: 32),
        if (detail.permissions.canArchive)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              detail.summary.isArchived
                  ? Icons.unarchive_outlined
                  : Icons.archive_outlined,
            ),
            title: Text(
              detail.summary.isArchived ? 'Restore Binder' : 'Archive Binder',
            ),
            subtitle: const Text('Archiving is reversible and read-only'),
            onTap: _archiveOrRestore,
          ),
        if (detail.permissions.canTransfer)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.swap_horiz_rounded),
            title: const Text('Transfer ownership'),
            subtitle: const Text('The new Owner must accept'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () async {
              await widget.controller.loadMembers();
              if (!context.mounted) return;
              await Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => BinderOwnerTransferScreen(
                    publicId: detail.summary.publicId,
                    members: widget.controller.members.items,
                    repository: widget.repository,
                  ),
                ),
              );
            },
          ),
        if (detail.summary.role == BinderRole.owner &&
            detail.summary.moderationState != BinderModerationState.frozen &&
            detail.summary.moderationState != BinderModerationState.removed)
          ListTile(
            key: const ValueKey('binder-delete-action'),
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              Icons.delete_forever_outlined,
              color: Theme.of(context).colorScheme.error,
            ),
            title: Text(
              'Delete Binder',
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
            subtitle: const Text('Vault copies are never deleted'),
            onTap: _delete,
          ),
        if (detail.permissions.canLeave)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.logout_rounded),
            title: const Text('Leave Binder'),
            subtitle: const Text(
              'Withdraws your Binder links, never your Vault copies',
            ),
            onTap: _leave,
          ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.flag_outlined),
          title: const Text('Report Binder'),
          onTap: () async {
            final reason = await showBinderReportReasonPicker(
              context,
              subjectLabel: 'this Binder',
            );
            if (reason == null) return;
            try {
              await widget.repository.report(
                surface: BinderReportSurface.binder,
                surfaceId: detail.summary.publicId,
                reason: reason.wireValue,
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Report submitted.')),
                );
              }
            } on BinderException {
              widget.onFailure();
            }
          },
        ),
      ],
    );
  }
}

class _BinderDeleteConfirmationDialog extends StatefulWidget {
  const _BinderDeleteConfirmationDialog({required this.requiredConfirmation});

  final String requiredConfirmation;

  @override
  State<_BinderDeleteConfirmationDialog> createState() =>
      _BinderDeleteConfirmationDialogState();
}

class _BinderDeleteConfirmationDialogState
    extends State<_BinderDeleteConfirmationDialog> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Delete this Binder?'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'This revokes links and invitations and closes Binder '
              'relationships. It never deletes anyone’s Vault copies.',
            ),
            const SizedBox(height: 6),
            Text('Type “${widget.requiredConfirmation}” to continue.'),
            const SizedBox(height: 12),
            TextField(
              key: const ValueKey('binder-delete-confirmation-input'),
              controller: _controller,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'Confirmation'),
              onChanged: (_) => setState(() {}),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _controller.text.trim() == widget.requiredConfirmation
              ? () => Navigator.pop(context, true)
              : null,
          child: const Text('Delete Binder'),
        ),
      ],
    );
  }
}

String _formatDateTime(DateTime value) {
  final local = value.toLocal();
  return '${local.month}/${local.day}/${local.year} '
      '${local.hour.toString().padLeft(2, '0')}:'
      '${local.minute.toString().padLeft(2, '0')}';
}
