import 'package:flutter/material.dart';

import '../../models/provisional_card.dart';
import '../../screens/provisional/provisional_card_screen.dart';
import '../../services/provisional/provisional_presentation.dart';
import '../card_surface_artwork.dart';

class ProvisionalCardSection extends StatelessWidget {
  const ProvisionalCardSection({
    required this.cards,
    this.title = 'Unconfirmed Cards',
    this.compact = false,
    super.key,
  });

  final List<PublicProvisionalCard> cards;
  final String title;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (cards.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // LOCK: Canonical and provisional search results must remain visually and structurally separated.
    // LOCK: Provisional cards are visible but non-canonical.
    return Padding(
      padding: EdgeInsets.fromLTRB(16, compact ? 8 : 14, 16, compact ? 8 : 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: -0.1,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            provisionalTrustCopy,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.62),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 10),
          Column(
            children: [
              for (final card in cards) ...[
                _ProvisionalCardTile(card: card),
                if (card != cards.last) const SizedBox(height: 8),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _ProvisionalCardTile extends StatelessWidget {
  const _ProvisionalCardTile({required this.card});

  final PublicProvisionalCard card;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) =>
                  ProvisionalCardScreen(candidateId: card.candidateId),
            ),
          );
        },
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.12),
            ),
          ),
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              SizedBox(
                width: 54,
                height: 76,
                child: CardSurfaceArtwork(
                  label: card.displayName,
                  imageUrl: card.imageUrl,
                  borderRadius: 12,
                  padding: const EdgeInsets.all(1),
                  enableTapToZoom: false,
                  showShadow: false,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      card.displayLabel,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      card.displayName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        height: 1.12,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      card.identityLine,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.62),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
