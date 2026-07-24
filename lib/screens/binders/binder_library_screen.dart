import 'dart:async';

import 'package:flutter/material.dart';

import '../../controllers/binders/binder_controllers.dart';
import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_feature_flags.dart';
import '../../services/binders/binder_repository.dart';
import '../../widgets/binders/binder_widgets.dart';
import 'binder_create_screen.dart';
import 'binder_detail_screen.dart';
import 'binder_discovery_screens.dart';

class BinderLibraryScreen extends StatefulWidget {
  const BinderLibraryScreen({
    this.repository,
    this.featureFlags = BinderFeatureFlags.production,
    this.initialPublicId,
    super.key,
  });

  final BinderRepository? repository;
  final BinderFeatureFlags featureFlags;
  final String? initialPublicId;

  @override
  State<BinderLibraryScreen> createState() => _BinderLibraryScreenState();
}

class _BinderLibraryScreenState extends State<BinderLibraryScreen> {
  late final BinderRepository _repository;
  late final BinderLibraryController _controller;
  bool _openedInitial = false;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? SupabaseBinderRepository();
    _controller = BinderLibraryController(repository: _repository)
      ..addListener(_onChanged);
    if (widget.featureFlags.personalAvailable) {
      unawaited(_controller.load());
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final initial = (widget.initialPublicId ?? '').trim();
    if (!_openedInitial &&
        initial.isNotEmpty &&
        widget.featureFlags.personalAvailable) {
      _openedInitial = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) unawaited(_openBinder(initial));
      });
    }
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_onChanged)
      ..dispose();
    super.dispose();
  }

  void _onChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _openBinder(String publicId) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => BinderDetailScreen(
          publicId: publicId,
          repository: _repository,
          featureFlags: widget.featureFlags,
        ),
      ),
    );
    if (mounted) unawaited(_controller.load(refresh: true));
  }

  Future<void> _createBinder() async {
    final publicId = await Navigator.of(context).push<String>(
      MaterialPageRoute<String>(
        builder: (_) => BinderCreateScreen(
          repository: _repository,
          featureFlags: widget.featureFlags,
        ),
      ),
    );
    if (!mounted || publicId == null || publicId.isEmpty) return;
    await _controller.load(refresh: true);
    if (mounted) await _openBinder(publicId);
  }

  Future<void> _respondInvitation(
    BinderInvitation invitation,
    bool accept,
  ) async {
    try {
      final publicId = await _repository.respondToInboxInvitation(
        invitationId: invitation.id,
        accept: accept,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            accept ? 'Invitation accepted.' : 'Invitation declined.',
          ),
        ),
      );
      await _controller.load(refresh: true);
      if (accept && mounted && publicId != null) await _openBinder(publicId);
    } on BinderException catch (failure) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(failure.message)));
    }
  }

  Future<void> _reportInvitation(BinderInvitation invitation) async {
    final reason = await showBinderReportReasonPicker(
      context,
      subjectLabel: 'this invitation',
    );
    if (reason == null) return;
    try {
      await _repository.report(
        surface: BinderReportSurface.invitation,
        surfaceId: invitation.id,
        reason: reason.wireValue,
      );
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Report submitted.')));
      }
    } on BinderException catch (failure) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(failure.message)));
      }
    }
  }

  Future<void> _leaveSuspended(BinderSuspendedAccess access) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave this Binder?'),
        content: const Text(
          'Your Binder relationship and live contributions will be closed. '
          'Nothing in your Vault will be changed.',
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
      await _repository.leaveBinder(access.publicId);
      await _controller.load(refresh: true);
    } on BinderException catch (failure) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(failure.message)));
      }
    }
  }

  Future<void> _reportSuspended(BinderSuspendedAccess access) async {
    final reason = await showBinderReportReasonPicker(
      context,
      subjectLabel: 'this Binder',
    );
    if (reason == null) return;
    try {
      await _repository.report(
        surface: BinderReportSurface.binder,
        surfaceId: access.publicId,
        reason: reason.wireValue,
      );
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Report submitted.')));
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
    final flags = widget.featureFlags;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Binders'),
        actions: [
          if (flags.communityAvailable)
            IconButton(
              tooltip: 'Explore Community Binders',
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => BinderExploreScreen(
                    repository: _repository,
                    featureFlags: flags,
                  ),
                ),
              ),
              icon: const Icon(Icons.public_rounded),
            ),
          PopupMenuButton<String>(
            tooltip: 'Binder options',
            onSelected: (value) {
              if (value == 'templates') {
                unawaited(
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => BinderTemplatesScreen(
                        repository: _repository,
                        featureFlags: flags,
                      ),
                    ),
                  ),
                );
              } else if (value == 'legacy') {
                unawaited(
                  Navigator.of(context)
                      .push(
                        MaterialPageRoute<void>(
                          builder: (_) => BinderLegacyConversionScreen(
                            repository: _repository,
                            featureFlags: flags,
                          ),
                        ),
                      )
                      .then((_) => _controller.load(refresh: true)),
                );
              }
            },
            itemBuilder: (_) => [
              if (flags.templatesAvailable)
                const PopupMenuItem(
                  value: 'templates',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.dashboard_customize_outlined),
                    title: Text('Templates'),
                  ),
                ),
              const PopupMenuItem(
                value: 'legacy',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.move_to_inbox_outlined),
                  title: Text('Tracked goals to convert'),
                ),
              ),
            ],
          ),
        ],
      ),
      floatingActionButton: flags.personalAvailable
          ? FloatingActionButton.extended(
              onPressed: _createBinder,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Create Binder'),
            )
          : null,
      body: !flags.personalAvailable
          ? const BinderStateMessage(
              icon: Icons.lock_clock_outlined,
              title: 'Binders are not enabled',
              body:
                  'This feature is safely turned off. Your Vault, Wall, '
                  'Pulse, and tracked goals have not changed.',
            )
          : _buildBody(),
    );
  }

  Widget _buildBody() {
    switch (_controller.status) {
      case BinderLoadStatus.initial:
      case BinderLoadStatus.loading:
        return const Center(child: CircularProgressIndicator.adaptive());
      case BinderLoadStatus.failed:
        final error = _controller.error;
        return BinderStateMessage(
          icon: error?.kind == BinderFailureKind.authentication
              ? Icons.lock_person_outlined
              : Icons.cloud_off_outlined,
          title: error?.kind == BinderFailureKind.authentication
              ? 'Sign in to view Binders'
              : 'Unable to load Binders',
          body: error?.message ?? 'Try again. Your Vault has not changed.',
          action: FilledButton.icon(
            onPressed: () => _controller.load(refresh: true),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Try again'),
          ),
        );
      case BinderLoadStatus.ready:
        return _buildLibrary();
    }
  }

  Widget _buildLibrary() {
    final page = _controller.page;
    final sections = <Widget>[
      if (_controller.isStale)
        BinderStaleBanner(
          lastAuthorizedAt: page.loadedAt,
          onRetry: () => _controller.load(refresh: true),
        ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        child: Text(
          'Collection goals powered by cards in your Vault.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ),
      if (page.invitations.isNotEmpty)
        _BinderInvitationSection(
          invitations: page.invitations,
          onRespond: _respondInvitation,
          onReport: _reportInvitation,
          hasMore: page.invitationsHaveMore,
          loadingMore: _controller.loadingMoreInvitations,
          onLoadMore: _controller.loadMoreInvitations,
        ),
      if (page.suspendedBinders.isNotEmpty)
        _BinderSuspendedSection(
          binders: page.suspendedBinders,
          hasMore: page.suspendedHaveMore,
          loadingMore: _controller.loadingMoreSuspended,
          onLoadMore: _controller.loadMoreSuspended,
          onLeave: _leaveSuspended,
          onReport: _reportSuspended,
        ),
      if (page.binders.isEmpty)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 46, 16, 120),
          child: BinderStateMessage(
            icon: Icons.collections_bookmark_outlined,
            title: 'No Binders yet',
            body: 'Start with a Pokémon or set.',
            action: FilledButton.icon(
              onPressed: _createBinder,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Create Binder'),
            ),
          ),
        )
      else ...[
        _BinderLibrarySection(
          title: 'Continue building',
          emptyText: 'Everything active is complete.',
          binders: page.continueBuilding,
          onOpen: _openBinder,
        ),
        _BinderLibrarySection(
          title: 'Shared with me',
          emptyText: 'Build together—invite family or friends.',
          binders: page.sharedWithMe,
          onOpen: _openBinder,
        ),
        _BinderLibrarySection(
          title: 'Completed',
          emptyText: 'Completed Binders will appear here.',
          binders: page.completed,
          onOpen: _openBinder,
        ),
        if (page.archived.isNotEmpty)
          _BinderLibrarySection(
            title: 'Archived',
            emptyText: '',
            binders: page.archived,
            onOpen: _openBinder,
          ),
      ],
      if (page.legacyCandidates.isNotEmpty)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
          child: OutlinedButton.icon(
            onPressed: () => Navigator.of(context)
                .push(
                  MaterialPageRoute<void>(
                    builder: (_) => BinderLegacyConversionScreen(
                      repository: _repository,
                      featureFlags: widget.featureFlags,
                    ),
                  ),
                )
                .then((_) => _controller.load(refresh: true)),
            icon: const Icon(Icons.move_to_inbox_outlined),
            label: Text(
              '${page.legacyCandidates.length} tracked '
              '${page.legacyCandidates.length == 1 ? 'goal' : 'goals'} '
              'available to convert',
            ),
          ),
        ),
      if (page.hasMore)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: OutlinedButton(
            onPressed: _controller.loadingMore ? null : _controller.loadMore,
            child: Text(_controller.loadingMore ? 'Loading…' : 'Load more'),
          ),
        ),
      const SizedBox(height: 100),
    ];

    return RefreshIndicator(
      onRefresh: () => _controller.load(refresh: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: sections,
      ),
    );
  }
}

class _BinderLibrarySection extends StatelessWidget {
  const _BinderLibrarySection({
    required this.title,
    required this.emptyText,
    required this.binders,
    required this.onOpen,
  });

  final String title;
  final String emptyText;
  final List<BinderSummary> binders;
  final Future<void> Function(String publicId) onOpen;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 9),
          if (binders.isEmpty)
            Text(
              emptyText,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            )
          else
            for (var i = 0; i < binders.length; i++) ...[
              if (i > 0) const SizedBox(height: 9),
              BinderSummaryCard(
                binder: binders[i],
                onTap: () => unawaited(onOpen(binders[i].publicId)),
              ),
            ],
        ],
      ),
    );
  }
}

class _BinderInvitationSection extends StatelessWidget {
  const _BinderInvitationSection({
    required this.invitations,
    required this.onRespond,
    required this.onReport,
    required this.hasMore,
    required this.loadingMore,
    required this.onLoadMore,
  });

  final List<BinderInvitation> invitations;
  final Future<void> Function(BinderInvitation invitation, bool accept)
  onRespond;
  final Future<void> Function(BinderInvitation invitation) onReport;
  final bool hasMore;
  final bool loadingMore;
  final Future<void> Function() onLoadMore;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Invitations',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          for (final invitation in invitations)
            Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      invitation.binderTitle ?? 'Shared Binder invitation',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Role: ${invitation.maximumRole.label}. '
                      'Cards stay in your Vault and only copies you choose '
                      'are linked.',
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => onReport(invitation),
                          child: const Text('Report'),
                        ),
                        TextButton(
                          onPressed: () => onRespond(invitation, false),
                          child: const Text('Decline'),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          onPressed: () => onRespond(invitation, true),
                          child: const Text('Accept'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          if (hasMore)
            Align(
              alignment: Alignment.center,
              child: OutlinedButton(
                onPressed: loadingMore ? null : onLoadMore,
                child: Text(loadingMore ? 'Loading…' : 'Load more invitations'),
              ),
            ),
        ],
      ),
    );
  }
}

class _BinderSuspendedSection extends StatelessWidget {
  const _BinderSuspendedSection({
    required this.binders,
    required this.hasMore,
    required this.loadingMore,
    required this.onLoadMore,
    required this.onLeave,
    required this.onReport,
  });

  final List<BinderSuspendedAccess> binders;
  final bool hasMore;
  final bool loadingMore;
  final Future<void> Function() onLoadMore;
  final Future<void> Function(BinderSuspendedAccess access) onLeave;
  final Future<void> Function(BinderSuspendedAccess access) onReport;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Suspended access',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          for (final access in binders)
            Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Suspended Binder membership',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Binder content is hidden. Only Leave and Report are '
                      'available while this membership is suspended.',
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        if (access.canReport)
                          TextButton(
                            onPressed: () => onReport(access),
                            child: const Text('Report'),
                          ),
                        if (access.canLeave)
                          FilledButton.tonal(
                            onPressed: () => onLeave(access),
                            child: const Text('Leave Binder'),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          if (hasMore)
            Align(
              alignment: Alignment.center,
              child: OutlinedButton(
                onPressed: loadingMore ? null : onLoadMore,
                child: Text(
                  loadingMore ? 'Loading…' : 'Load more suspended Binders',
                ),
              ),
            ),
        ],
      ),
    );
  }
}
