import 'package:flutter/material.dart';

import 'network_discover_screen.dart';

class NetworkScreen extends StatefulWidget {
  const NetworkScreen({super.key});

  @override
  State<NetworkScreen> createState() => NetworkScreenState();
}

class NetworkScreenState extends State<NetworkScreen> {
  String? _intent;

  void reload() {
    if (!mounted) {
      return;
    }

    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Card stream',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              TextButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const NetworkDiscoverScreen(),
                    ),
                  );
                },
                icon: const Icon(Icons.people_outline_rounded),
                label: const Text('Collectors'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _NetworkSurfaceCard(
            padding: const EdgeInsets.all(6),
            child: Row(
              children: [
                const Expanded(
                  child: _NetworkLaneButton(label: 'Cards', selected: true),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _NetworkLaneButton(
                    label: 'Collectors',
                    selected: false,
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const NetworkDiscoverScreen(),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          _NetworkSurfaceCard(
            padding: const EdgeInsets.all(10),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _IntentChip(
                  label: 'All intents',
                  selected: _intent == null,
                  onPressed: () {
                    setState(() {
                      _intent = null;
                    });
                  },
                ),
                _IntentChip(
                  label: 'Trade',
                  selected: _intent == 'trade',
                  onPressed: () {
                    setState(() {
                      _intent = 'trade';
                    });
                  },
                ),
                _IntentChip(
                  label: 'Sell',
                  selected: _intent == 'sell',
                  onPressed: () {
                    setState(() {
                      _intent = 'sell';
                    });
                  },
                ),
                _IntentChip(
                  label: 'Showcase',
                  selected: _intent == 'showcase',
                  onPressed: () {
                    setState(() {
                      _intent = 'showcase';
                    });
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          _NetworkContentSection(intent: _intent),
        ],
      ),
    );
  }
}

class _NetworkContentSection extends StatelessWidget {
  const _NetworkContentSection({required this.intent});

  final String? intent;

  @override
  Widget build(BuildContext context) {
    final title = intent == null
        ? 'Latest cards'
        : '${_intentLabel(intent!)} cards';
    const emptyTitle = 'No cards available right now';
    const emptyBody =
        'Collectors will appear here when they mark cards for trade, sale, or showcase.';

    return _NetworkSurfaceCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 10),
          _NetworkEmptyState(title: emptyTitle, body: emptyBody),
        ],
      ),
    );
  }

  String _intentLabel(String intent) {
    switch (intent) {
      case 'trade':
        return 'Trade';
      case 'sell':
        return 'Sell';
      case 'showcase':
        return 'Showcase';
      default:
        return intent;
    }
  }
}

class _NetworkSurfaceCard extends StatelessWidget {
  const _NetworkSurfaceCard({required this.child, required this.padding});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      padding: padding,
      child: child,
    );
  }
}

class _NetworkLaneButton extends StatelessWidget {
  const _NetworkLaneButton({
    required this.label,
    required this.selected,
    this.onPressed,
  });

  final String label;
  final bool selected;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return FilledButton(
      onPressed: selected ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: selected
            ? colorScheme.primary
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
        foregroundColor: selected
            ? colorScheme.onPrimary
            : colorScheme.onSurface,
        disabledBackgroundColor: colorScheme.primary,
        disabledForegroundColor: colorScheme.onPrimary,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: theme.textTheme.labelMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
      ),
      child: Text(label),
    );
  }
}

class _IntentChip extends StatelessWidget {
  const _IntentChip({
    required this.label,
    required this.selected,
    required this.onPressed,
  });

  final String label;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onPressed(),
      selectedColor: colorScheme.primary.withValues(alpha: 0.14),
      backgroundColor: colorScheme.surfaceContainerHighest.withValues(
        alpha: 0.45,
      ),
      side: BorderSide(
        color: selected
            ? colorScheme.primary.withValues(alpha: 0.42)
            : colorScheme.outline.withValues(alpha: 0.14),
      ),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }
}

class _NetworkEmptyState extends StatelessWidget {
  const _NetworkEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            body,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.72),
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}
