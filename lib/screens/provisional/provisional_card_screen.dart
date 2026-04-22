import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../models/card_print.dart';
import '../../models/provisional_card.dart';
import '../../services/provisional/provisional_continuity_service.dart';
import '../../services/provisional/provisional_presentation.dart';
import '../../widgets/card_surface_artwork.dart';

class ProvisionalCardScreen extends StatefulWidget {
  const ProvisionalCardScreen({required this.candidateId, super.key});

  final String candidateId;

  @override
  State<ProvisionalCardScreen> createState() => _ProvisionalCardScreenState();
}

class _ProvisionalCardScreenState extends State<ProvisionalCardScreen> {
  final SupabaseClient _client = Supabase.instance.client;

  PublicProvisionalCard? _card;
  bool _loading = true;
  bool _notFound = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final continuity = await ProvisionalContinuityService.resolve(
      widget.candidateId,
    );
    if (!mounted) {
      return;
    }

    if (continuity.kind == ProvisionalContinuityKind.redirect) {
      final gvId = continuity.gvId ?? '';
      final card = await CardPrintRepository.getCardPrintByGvId(
        client: _client,
        gvId: gvId,
      );
      if (!mounted) {
        return;
      }
      if (card != null) {
        await Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(
            builder: (_) => CardDetailScreen(
              cardPrintId: card.id,
              gvId: card.gvId,
              name: card.name,
              setName: card.setName,
              setCode: card.setCode,
              number: card.displayNumber,
              rarity: card.rarity,
              imageUrl: card.displayImageUrl,
              entrySurface: 'provisional_continuity',
            ),
          ),
        );
        return;
      }
    }

    setState(() {
      _card = continuity.card;
      _notFound = continuity.kind != ProvisionalContinuityKind.provisional;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Unconfirmed Card'), centerTitle: false),
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _notFound || _card == null
              ? _ProvisionalNotFound(colorScheme: colorScheme, theme: theme)
              : _ProvisionalDetail(card: _card!),
        ),
      ),
    );
  }
}

class _ProvisionalDetail extends StatelessWidget {
  const _ProvisionalDetail({required this.card});

  final PublicProvisionalCard card;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // LOCK: This screen is a trust-safe provisional surface.
    // LOCK: Do not add vault, pricing, provenance, ownership, or GV-ID here.
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 28),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: AspectRatio(
              aspectRatio: 0.69,
              child: CardSurfaceArtwork(
                label: card.displayName,
                imageUrl: card.displayImageUrl,
                borderRadius: 20,
                enableTapToZoom: false,
                showShadow: false,
              ),
            ),
          ),
        ),
        const SizedBox(height: 24),
        Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.12),
            ),
          ),
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest.withValues(
                    alpha: 0.42,
                  ),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: colorScheme.outline.withValues(alpha: 0.10),
                  ),
                ),
                child: Text(
                  card.displayLabel,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.70),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                card.displayName,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  height: 1.05,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                card.identityLine,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.62),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                provisionalTrustCopy,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.70),
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                provisionalNotCanonCopy,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.62),
                  height: 1.45,
                ),
              ),
              if ((card.sourceLabel ?? '').trim().isNotEmpty) ...[
                const SizedBox(height: 14),
                Text(
                  card.sourceLabel!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.52),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _ProvisionalNotFound extends StatelessWidget {
  const _ProvisionalNotFound({required this.colorScheme, required this.theme});

  final ColorScheme colorScheme;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          'This card is not available right now.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.64),
          ),
        ),
      ),
    );
  }
}
