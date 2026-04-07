import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/vault/vault_gvvi_service.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/contact_owner_button.dart';
import '../public_collector/public_collector_screen.dart';

class PublicGvviScreen extends StatefulWidget {
  const PublicGvviScreen({required this.gvviId, super.key});

  final String gvviId;

  @override
  State<PublicGvviScreen> createState() => _PublicGvviScreenState();
}

class _PublicGvviScreenState extends State<PublicGvviScreen> {
  final SupabaseClient _client = Supabase.instance.client;

  PublicGvviData? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await VaultGvviService.loadPublic(
        client: _client,
        gvviId: widget.gvviId,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _data = data;
        _loading = false;
        _error = data == null ? 'Exact copy not found.' : null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _openCollector(PublicGvviData data) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicCollectorScreen(slug: data.ownerSlug),
      ),
    );
  }

  Future<void> _openCard(PublicGvviData data) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: data.cardPrintId,
          gvId: data.gvId,
          name: data.cardName,
          setName: data.setName,
          setCode: data.setCode,
          number: data.number,
          imageUrl: data.imageUrl,
          contactVaultItemId: data.vaultItemId,
          contactOwnerDisplayName: data.ownerDisplayName,
          contactOwnerUserId: data.ownerUserId,
          contactIntent: data.intent,
          exactCopyGvviId: data.gvviId,
          exactCopyOwnerUserId: data.ownerUserId,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Exact Copy'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _data == null
          ? _PublicGvviStateCard(
              icon: Icons.style_outlined,
              title: 'Exact copy unavailable',
              body: _error ?? 'This GVVI could not be loaded.',
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _PublicGvviHero(data: _data!),
                  const SizedBox(height: 14),
                  Text(
                    _data!.cardName,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _ExactCopyChip(
                        label: _intentLabel(_data!.intent),
                        tone: Theme.of(context).colorScheme.primary,
                      ),
                      _ExactCopyChip(
                        label: _data!.isGraded ? 'Graded slab' : 'Raw copy',
                        tone: Colors.deepPurple,
                      ),
                      if ((_data!.conditionLabel ?? '').trim().isNotEmpty &&
                          !_data!.isGraded)
                        _ExactCopyChip(
                          label: _data!.conditionLabel!,
                          tone: Colors.teal,
                        ),
                      if ((_data!.certNumber ?? '').trim().isNotEmpty)
                        _ExactCopyChip(
                          label: 'Cert ${_data!.certNumber}',
                          tone: Colors.indigo,
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _ActionPathRow(
                    leadingLabel: 'Collector',
                    title: _data!.ownerDisplayName,
                    supporting: '@${_data!.ownerSlug}',
                    onTap: () => _openCollector(_data!),
                  ),
                  const SizedBox(height: 8),
                  _ActionPathRow(
                    leadingLabel: 'Card',
                    title: _data!.setName,
                    supporting: [
                      if (_data!.setCode.isNotEmpty) _data!.setCode,
                      if (_data!.number != '—') '#${_data!.number}',
                    ].join(' • '),
                    onTap: () => _openCard(_data!),
                  ),
                  const SizedBox(height: 10),
                  _PublicGvviPriceRow(data: _data!),
                  const SizedBox(height: 10),
                  _CompactIdentityGrid(data: _data!),
                  if ((_data!.publicNote ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _PublicNoteSurface(note: _data!.publicNote!),
                  ],
                  if (_data!.hasExactMedia) ...[
                    const SizedBox(height: 12),
                    _PublicGvviPhotos(data: _data!),
                  ],
                  if (_data!.isDiscoverable) ...[
                    const SizedBox(height: 14),
                    ContactOwnerButton(
                      vaultItemId: _data!.vaultItemId,
                      cardPrintId: _data!.cardPrintId,
                      ownerUserId: _data!.ownerUserId,
                      ownerDisplayName: _data!.ownerDisplayName,
                      cardName: _data!.cardName,
                      intent: _data!.intent,
                      buttonLabel: _contactLabel(_data!.intent),
                    ),
                  ],
                ],
              ),
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
        return 'Hold';
    }
  }

  String _contactLabel(String intent) {
    switch (intent) {
      case 'trade':
        return 'Ask to trade';
      case 'sell':
        return 'Ask to buy';
      case 'showcase':
        return 'Contact owner';
      default:
        return 'Contact owner';
    }
  }
}

class _PublicGvviHero extends StatelessWidget {
  const _PublicGvviHero({required this.data});

  final PublicGvviData data;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 250),
        child: AspectRatio(
          aspectRatio: 3 / 4,
          child: CardSurfaceArtwork(
            label: data.cardName,
            imageUrl: data.primaryImageUrl ?? data.fallbackImageUrl,
            borderRadius: 22,
            padding: const EdgeInsets.all(8),
            showZoomAffordance:
                (data.primaryImageUrl ?? data.fallbackImageUrl ?? '')
                    .trim()
                    .isNotEmpty,
          ),
        ),
      ),
    );
  }
}

class _ActionPathRow extends StatelessWidget {
  const _ActionPathRow({
    required this.leadingLabel,
    required this.title,
    required this.supporting,
    required this.onTap,
  });

  final String leadingLabel;
  final String title;
  final String supporting;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.045),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: colorScheme.primary.withValues(alpha: 0.12),
            ),
          ),
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      leadingLabel.toUpperCase(),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.75,
                        color: colorScheme.onSurface.withValues(alpha: 0.52),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: colorScheme.primary,
                      ),
                    ),
                    if (supporting.trim().isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        supporting,
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.62,
                              ),
                            ),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(
                Icons.arrow_outward_rounded,
                size: 16,
                color: colorScheme.primary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PublicGvviPriceRow extends StatelessWidget {
  const _PublicGvviPriceRow({required this.data});

  final PublicGvviData data;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final headline = switch (data.pricingMode) {
      GvviPricingMode.asking => VaultGvviService.formatPrice(
        data.askingPriceAmount,
        currency: data.askingPriceCurrency ?? 'USD',
      ),
      GvviPricingMode.market => VaultGvviService.formatPrice(
        data.marketReferencePrice,
      ),
    };
    final label = data.pricingMode == GvviPricingMode.asking
        ? 'Asking price'
        : 'Market reference';
    final supporting = data.pricingMode == GvviPricingMode.asking
        ? data.askingPriceNote
        : _pricingSourceLabel(data.marketReferenceSource);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.75,
              color: colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            headline ??
                (data.isGraded
                    ? 'No market reference for this slab yet.'
                    : 'No market reference available.'),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: -0.45,
            ),
          ),
          if ((supporting ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 3),
            Text(
              supporting!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String? _pricingSourceLabel(String? source) {
    switch ((source ?? '').trim().toLowerCase()) {
      case 'justtcg':
        return 'JustTCG';
      case 'ebay':
        return 'eBay';
      default:
        return null;
    }
  }
}

class _CompactIdentityGrid extends StatelessWidget {
  const _CompactIdentityGrid({required this.data});

  final PublicGvviData data;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _ExactCopyMeta(label: 'GVVI', value: data.gvviId),
        _ExactCopyMeta(label: 'Set', value: data.setCode),
        _ExactCopyMeta(label: 'Number', value: data.number),
        _ExactCopyMeta(
          label: 'Condition',
          value: data.isGraded ? 'SLAB' : (data.conditionLabel ?? 'Unknown'),
        ),
        _ExactCopyMeta(label: 'Grader', value: data.grader ?? '—'),
        _ExactCopyMeta(
          label: 'Grade / Cert',
          value:
              [
                    data.grade,
                    data.certNumber != null ? 'Cert ${data.certNumber}' : null,
                  ]
                  .whereType<String>()
                  .where((value) => value.trim().isNotEmpty)
                  .join(' • ')
                  .trim()
                  .isEmpty
              ? '—'
              : [
                      data.grade,
                      data.certNumber != null
                          ? 'Cert ${data.certNumber}'
                          : null,
                    ]
                    .whereType<String>()
                    .where((value) => value.trim().isNotEmpty)
                    .join(' • '),
        ),
      ],
    );
  }
}

class _PublicNoteSurface extends StatelessWidget {
  const _PublicNoteSurface({required this.note});

  final String note;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 11, 12, 11),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        note,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          height: 1.35,
          color: colorScheme.onSurface.withValues(alpha: 0.82),
        ),
      ),
    );
  }
}

class _PublicGvviPhotos extends StatelessWidget {
  const _PublicGvviPhotos({required this.data});

  final PublicGvviData data;

  @override
  Widget build(BuildContext context) {
    final photos = <({String label, String url})>[
      if ((data.frontImageUrl ?? '').trim().isNotEmpty)
        (label: 'Front', url: data.frontImageUrl!),
      if ((data.backImageUrl ?? '').trim().isNotEmpty)
        (label: 'Back', url: data.backImageUrl!),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Photos',
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            for (var index = 0; index < photos.length; index++) ...[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      photos[index].label.toUpperCase(),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.75,
                      ),
                    ),
                    const SizedBox(height: 6),
                    AspectRatio(
                      aspectRatio: 3 / 4,
                      child: CardSurfaceArtwork(
                        label: '${data.cardName} ${photos[index].label}',
                        imageUrl: photos[index].url,
                        borderRadius: 18,
                        padding: const EdgeInsets.all(6),
                        showZoomAffordance: true,
                      ),
                    ),
                  ],
                ),
              ),
              if (index < photos.length - 1) const SizedBox(width: 10),
            ],
          ],
        ),
      ],
    );
  }
}

class _ExactCopyChip extends StatelessWidget {
  const _ExactCopyChip({required this.label, required this.tone});

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.withValues(alpha: 0.18)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: tone,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ExactCopyMeta extends StatelessWidget {
  const _ExactCopyMeta({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: 166,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.75,
              color: colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _PublicGvviStateCard extends StatelessWidget {
  const _PublicGvviStateCard({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.12),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 28, color: colorScheme.primary),
              const SizedBox(height: 12),
              Text(
                title,
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                body,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.72),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
