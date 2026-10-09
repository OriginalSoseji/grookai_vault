import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../controllers/binders/binder_continuation_controller.dart';
import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_repository.dart';
import '../../widgets/binders/binder_widgets.dart';
import '../../widgets/gv_surface.dart';

class BinderContinuationPanel extends StatefulWidget {
  const BinderContinuationPanel({
    super.key,
    required this.ownerId,
    required this.onOpenBinder,
    required this.onOpenLibrary,
    this.repository,
    this.ownerChanges,
  });
  final String ownerId;
  final Future<void> Function(String publicId) onOpenBinder;
  final Future<void> Function() onOpenLibrary;
  final BinderRepository? repository;
  final Stream<void>? ownerChanges;

  @override
  State<BinderContinuationPanel> createState() =>
      BinderContinuationPanelState();
}

class BinderContinuationPanelState extends State<BinderContinuationPanel> {
  late BinderContinuationController _controller;
  StreamSubscription<void>? _ownerSubscription;
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  void _start() {
    _expanded = false;
    _controller = BinderContinuationController(
      ownerId: widget.ownerId,
      repository: widget.repository ?? SupabaseBinderRepository(),
    )..addListener(_changed);
    final changes =
        widget.ownerChanges ??
        (widget.repository == null
            ? Supabase.instance.client.auth.onAuthStateChange.map<void>((_) {})
            : null);
    _ownerSubscription = changes?.listen((_) => _controller.checkOwner());
    unawaited(_controller.load());
  }

  void _stop() {
    unawaited(_ownerSubscription?.cancel());
    _ownerSubscription = null;
    _controller
      ..removeListener(_changed)
      ..dispose();
  }

  @override
  void didUpdateWidget(covariant BinderContinuationPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.ownerId != widget.ownerId ||
        oldWidget.repository != widget.repository ||
        oldWidget.ownerChanges != widget.ownerChanges) {
      _stop();
      _start();
    }
  }

  @override
  void dispose() {
    _stop();
    super.dispose();
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  Future<void> reload() => _controller.load();

  Future<void> _open(String publicId) async {
    _controller.checkOwner();
    if (_controller.status == BinderContinuationStatus.closed) return;
    await widget.onOpenBinder(publicId);
    if (mounted) await _controller.load();
  }

  @override
  Widget build(BuildContext context) {
    if (_controller.status == BinderContinuationStatus.closed) {
      return const SizedBox.shrink();
    }
    final theme = Theme.of(context);
    return GvSurface(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            children: [
              Text('Continue collecting', style: theme.textTheme.titleMedium),
              TextButton(
                onPressed: widget.onOpenLibrary,
                child: const Text('All Binders'),
              ),
            ],
          ),
          switch (_controller.status) {
            BinderContinuationStatus.initial ||
            BinderContinuationStatus.loading => const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: LinearProgressIndicator(
                semanticsLabel: 'Loading collection goals',
              ),
            ),
            BinderContinuationStatus.unavailable => Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              children: [
                const Text(
                  'Goals could not load. Your Vault is still available.',
                ),
                TextButton.icon(
                  onPressed: reload,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Try again'),
                ),
              ],
            ),
            BinderContinuationStatus.ready => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final binder
                    in _expanded
                        ? _controller.visible
                        : _controller.visible.take(1))
                  _goal(binder),
                if (_controller.visible.length > 1)
                  Semantics(
                    expanded: _expanded,
                    child: TextButton.icon(
                      onPressed: () => setState(() => _expanded = !_expanded),
                      icon: Icon(
                        _expanded ? Icons.expand_less : Icons.expand_more,
                      ),
                      label: Text(
                        _expanded
                            ? 'Show fewer goals'
                            : 'Show ${_controller.visible.length - 1} more ${_controller.visible.length == 2 ? 'goal' : 'goals'}',
                      ),
                    ),
                  ),
                if (_controller.visible.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      _controller.hasNoBinders
                          ? 'Build a Binder for the cards you want to collect.'
                          : 'Find your next goal in Binders.',
                    ),
                  ),
                if (_controller.hasMore)
                  Text(
                    'More goals may be available in Binders.',
                    style: theme.textTheme.bodySmall,
                  ),
              ],
            ),
            BinderContinuationStatus.closed => const SizedBox.shrink(),
          },
        ],
      ),
    );
  }

  Widget _goal(BinderSummary binder) => Padding(
    padding: EdgeInsets.zero,
    child: Material(
      type: MaterialType.transparency,
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(binder.title),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6, bottom: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (binder.role != BinderRole.owner) const Text('Shared Binder'),
              if (binder.totalSlots > 0)
                BinderProgressBar(
                  completed: binder.completedSlots,
                  total: binder.totalSlots,
                  unit: binder.effectiveProgressUnit,
                  compact: true,
                )
              else
                const Text('Choose the cards you want to collect.'),
            ],
          ),
        ),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: () => unawaited(_open(binder.publicId)),
      ),
    ),
  );
}
