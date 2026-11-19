import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/competitive/pokemon_playables_service.dart';

class PokemonPlayableBadge extends StatefulWidget {
  const PokemonPlayableBadge({
    super.key,
    required this.cardPrintId,
    this.service,
    this.padding = EdgeInsets.zero,
  });
  final String cardPrintId;
  final PokemonPlayablesService? service;
  final EdgeInsetsGeometry padding;

  @override
  State<PokemonPlayableBadge> createState() => _PokemonPlayableBadgeState();
}

class _PokemonPlayableBadgeState extends State<PokemonPlayableBadge>
    with WidgetsBindingObserver {
  PokemonPlayablesService get service =>
      widget.service ?? PokemonPlayablesService.instance;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    service.addListener(_changed);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(service.refresh());
    });
  }

  @override
  void didUpdateWidget(PokemonPlayableBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.service != widget.service) {
      (oldWidget.service ?? PokemonPlayablesService.instance).removeListener(
        _changed,
      );
      service.addListener(_changed);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) unawaited(service.refresh());
      });
    }
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(service.refresh(force: true));
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    service.removeListener(_changed);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = service.currentSnapshot;
    final usage = service.usageFor(widget.cardPrintId);
    if (snapshot == null || usage == null) return const SizedBox.shrink();
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final localizations = MaterialLocalizations.of(context);
    String stamp(DateTime date) {
      final local = date.toLocal();
      return '${localizations.formatMediumDate(local)} '
          '${localizations.formatTimeOfDay(TimeOfDay.fromDateTime(local))}';
    }

    final explanation =
        'Pokémon Standard · recent decklist usage. '
        '${usage.lists} published lists across ${usage.events} events in the last 30 days. '
        'Updated ${stamp(snapshot.asOf)}. Valid until ${stamp(snapshot.validUntil)}. '
        'Published Standard decklists from Limitless; TCGdex metadata.';
    return Padding(
      padding: widget.padding,
      child: Tooltip(
        message: explanation,
        child: Semantics(
          label: 'Playable. $explanation',
          excludeSemantics: true,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: colors.surface.withValues(alpha: 0.96),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: colors.primary.withValues(alpha: 0.65)),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              child: Text(
                'Playable',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colors.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
