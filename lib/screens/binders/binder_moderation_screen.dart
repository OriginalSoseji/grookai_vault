import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_repository.dart';
import '../../widgets/binders/binder_widgets.dart';

class BinderModerationQueueScreen extends StatefulWidget {
  const BinderModerationQueueScreen({
    required this.publicId,
    required this.repository,
    super.key,
  });

  final String publicId;
  final BinderRepository repository;

  @override
  State<BinderModerationQueueScreen> createState() =>
      _BinderModerationQueueScreenState();
}

class _BinderModerationQueueScreenState
    extends State<BinderModerationQueueScreen> {
  BinderPage<BinderPendingContribution> _contributions =
      const BinderPage<BinderPendingContribution>(
        items: <BinderPendingContribution>[],
      );
  BinderPage<BinderJoinRequest> _joinRequests =
      const BinderPage<BinderJoinRequest>(items: <BinderJoinRequest>[]);
  final Set<String> _busy = <String>{};
  BinderException? _error;
  bool _loading = true;
  bool _loadingMoreContributions = false;
  bool _loadingMoreJoinRequests = false;

  bool _contributionIsBusy(BinderPendingContribution contribution) {
    final id = contribution.reference.contributionId;
    final reportReference =
        contribution.reference.effectiveReportReference ?? '';
    final blockReference = contribution.reference.effectiveBlockReference ?? '';
    return _busy.contains(id) ||
        _busy.contains('report:$reportReference') ||
        _busy.contains('block:$blockReference');
  }

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    BinderPage<BinderPendingContribution>? contributions;
    BinderPage<BinderJoinRequest>? joinRequests;
    BinderException? firstFailure;
    try {
      await Future.wait<void>([
        () async {
          try {
            contributions = await widget.repository.loadPendingContributions(
              publicId: widget.publicId,
            );
          } on BinderException catch (failure) {
            firstFailure ??= failure;
          }
        }(),
        () async {
          try {
            joinRequests = await widget.repository.loadJoinRequestsQueue(
              publicId: widget.publicId,
            );
          } on BinderException catch (failure) {
            firstFailure ??= failure;
          }
        }(),
      ]);
    } finally {
      if (mounted) {
        setState(() {
          if (contributions != null) _contributions = contributions!;
          if (joinRequests != null) _joinRequests = joinRequests!;
          _error = firstFailure;
          _loading = false;
        });
      }
    }
  }

  Future<void> _loadMoreContributions() async {
    final cursor = _contributions.nextCursor;
    if (cursor == null || _loadingMoreContributions) return;
    setState(() => _loadingMoreContributions = true);
    try {
      final next = await widget.repository.loadPendingContributions(
        publicId: widget.publicId,
        cursor: cursor,
      );
      if (!mounted) return;
      final ids = _contributions.items
          .map((item) => item.reference.contributionId)
          .toSet();
      setState(
        () => _contributions = BinderPage<BinderPendingContribution>(
          items: <BinderPendingContribution>[
            ..._contributions.items,
            ...next.items.where(
              (item) => ids.add(item.reference.contributionId),
            ),
          ],
          nextCursor: next.nextCursor,
          hasMore: next.hasMore,
        ),
      );
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _loadingMoreContributions = false);
    }
  }

  Future<void> _loadMoreJoinRequests() async {
    final cursor = _joinRequests.nextCursor;
    if (cursor == null || _loadingMoreJoinRequests) return;
    setState(() => _loadingMoreJoinRequests = true);
    try {
      final next = await widget.repository.loadJoinRequestsQueue(
        publicId: widget.publicId,
        cursor: cursor,
      );
      if (!mounted) return;
      final ids = _joinRequests.items.map((item) => item.id).toSet();
      setState(
        () => _joinRequests = BinderPage<BinderJoinRequest>(
          items: <BinderJoinRequest>[
            ..._joinRequests.items,
            ...next.items.where((item) => ids.add(item.id)),
          ],
          nextCursor: next.nextCursor,
          hasMore: next.hasMore,
        ),
      );
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _loadingMoreJoinRequests = false);
    }
  }

  Future<void> _mutate(
    String key,
    Future<void> Function() action, {
    bool refetch = true,
  }) async {
    if (_busy.contains(key)) return;
    setState(() {
      _busy.add(key);
      _error = null;
    });
    try {
      await action();
      if (refetch) await _load();
    } on BinderException catch (failure) {
      if (mounted) setState(() => _error = failure);
    } finally {
      if (mounted) setState(() => _busy.remove(key));
    }
  }

  Future<void> _reportContribution(
    BinderPendingContribution contribution,
  ) async {
    final reference = contribution.reference.effectiveReportReference;
    if (reference == null) return;
    final reason = await showBinderReportReasonPicker(
      context,
      subjectLabel: 'this contribution',
    );
    if (reason == null) return;
    await _mutate(
      'report:$reference',
      () => widget.repository.report(
        surface: BinderReportSurface.contribution,
        surfaceId: reference,
        reason: reason.wireValue,
      ),
      refetch: false,
    );
    if (mounted && _error == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Report submitted.')));
    }
  }

  Future<void> _blockContributor(BinderPendingContribution contribution) async {
    final reference = contribution.reference.effectiveBlockReference;
    if (reference == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Block this Binder member?'),
        content: const Text(
          'The server applies the lawful Binder relationship changes. '
          'No account or Vault identifier is exposed here.',
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
    await _mutate(
      'block:$reference',
      () => widget.repository.blockMember(reference),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Binder review queue')),
      body:
          _loading &&
              _contributions.items.isEmpty &&
              _joinRequests.items.isEmpty
          ? const Center(child: CircularProgressIndicator.adaptive())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 32),
                children: [
                  const BinderVaultBoundaryNotice(),
                  const SizedBox(height: 18),
                  Text(
                    'Pending card contributions',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 7),
                  if (_contributions.items.isEmpty)
                    const Text('No card contributions need review.')
                  else
                    for (final contribution in _contributions.items)
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: BinderArtwork(
                            imageUrl: contribution.imageUrl,
                            size: 52,
                            semanticLabel: contribution.name,
                          ),
                          title: Text(contribution.name),
                          subtitle: Text(
                            [
                              if ((contribution.reference.memberLabel ?? '')
                                  .isNotEmpty)
                                contribution.reference.memberLabel!,
                              if ((contribution.finishLabel ?? '').isNotEmpty)
                                contribution.finishLabel!,
                            ].join(' · '),
                          ),
                          trailing: PopupMenuButton<String>(
                            enabled: !_contributionIsBusy(contribution),
                            onSelected: (value) {
                              final id = contribution.reference.contributionId;
                              if (value == 'approve') {
                                unawaited(
                                  _mutate(
                                    id,
                                    () => widget.repository.decideContribution(
                                      contributionId: id,
                                      approve: true,
                                    ),
                                  ),
                                );
                              } else if (value == 'reject') {
                                unawaited(
                                  _mutate(
                                    id,
                                    () => widget.repository.decideContribution(
                                      contributionId: id,
                                      approve: false,
                                    ),
                                  ),
                                );
                              } else if (value == 'report') {
                                unawaited(_reportContribution(contribution));
                              } else if (value == 'block') {
                                unawaited(_blockContributor(contribution));
                              }
                            },
                            itemBuilder: (_) => [
                              if (contribution.reference.canDecide)
                                const PopupMenuItem(
                                  value: 'approve',
                                  child: Text('Approve contribution'),
                                ),
                              if (contribution.reference.canDecide)
                                const PopupMenuItem(
                                  value: 'reject',
                                  child: Text('Reject contribution'),
                                ),
                              if (contribution.reference.canReport)
                                const PopupMenuItem(
                                  value: 'report',
                                  child: Text('Report contribution'),
                                ),
                              if (contribution.reference.canBlockMember)
                                const PopupMenuItem(
                                  value: 'block',
                                  child: Text('Block member'),
                                ),
                            ],
                          ),
                        ),
                      ),
                  if (_contributions.hasMore)
                    OutlinedButton(
                      onPressed: _loadingMoreContributions
                          ? null
                          : _loadMoreContributions,
                      child: Text(
                        _loadingMoreContributions
                            ? 'Loading…'
                            : 'Load more contributions',
                      ),
                    ),
                  const Divider(height: 32),
                  Text(
                    'Join requests',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 7),
                  if (_joinRequests.items.isEmpty)
                    const Text('No collectors are waiting to join.')
                  else
                    for (final request in _joinRequests.items)
                      ListTile(
                        leading: const CircleAvatar(
                          child: Icon(Icons.person_outline_rounded),
                        ),
                        title: Text(request.requesterLabel ?? 'Collector'),
                        subtitle: Text(
                          'Requests ${request.requestedRole.label} access',
                        ),
                        trailing: request.canDecide
                            ? Wrap(
                                children: [
                                  IconButton(
                                    tooltip: 'Reject join request',
                                    onPressed: _busy.contains(request.id)
                                        ? null
                                        : () => _mutate(
                                            request.id,
                                            () => widget.repository
                                                .decideJoinRequest(
                                                  requestId: request.id,
                                                  approve: false,
                                                ),
                                          ),
                                    icon: const Icon(Icons.close_rounded),
                                  ),
                                  IconButton(
                                    tooltip: 'Approve join request',
                                    onPressed: _busy.contains(request.id)
                                        ? null
                                        : () => _mutate(
                                            request.id,
                                            () => widget.repository
                                                .decideJoinRequest(
                                                  requestId: request.id,
                                                  approve: true,
                                                ),
                                          ),
                                    icon: const Icon(Icons.check_rounded),
                                  ),
                                ],
                              )
                            : null,
                      ),
                  if (_joinRequests.hasMore)
                    OutlinedButton(
                      onPressed: _loadingMoreJoinRequests
                          ? null
                          : _loadMoreJoinRequests,
                      child: Text(
                        _loadingMoreJoinRequests
                            ? 'Loading…'
                            : 'Load more join requests',
                      ),
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
                ],
              ),
            ),
    );
  }
}
