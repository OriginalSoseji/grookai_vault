import 'package:flutter/material.dart';
import 'grookai_object_atoms.dart';
import 'grookai_object_frame.dart';
import 'grookai_object_models.dart';
import 'grookai_object_skin.dart';

/// Front side — "Collector Memory Card.dc.html" §1a-1c FRONT.
class MemoryCardFront extends StatelessWidget {
  final MemoryCardData data;
  const MemoryCardFront({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final t = grookaiObjectTokens[data.skin]!;
    return GrookaiObjectFrame(
      skin: data.skin,
      child: Column(
        children: [
          Align(
            alignment: Alignment.topLeft,
            child: Text(
              'GROOKAI VAULT',
              style: monoLabel(
                t,
                size: 10.5,
                color: t.accent,
                letterSpacing: 0.24,
                weight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Center(
              child: data.card.cardImageUrl != null
                  ? GrookaiObjectNetworkImage(
                      imageUrl: data.card.cardImageUrl!,
                      fallbackImageUrl: data.card.cardImageFallbackUrl,
                      width: 200,
                    )
                  : const CardArtPlaceholder(width: 200, height: 280),
            ),
          ),
          Text(
            data.card.cardName,
            style: serifTitle(t, size: 30),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            'MY COLLECTOR MEMORY',
            style: monoLabel(t, size: 10, letterSpacing: 0.16),
          ),
          const SizedBox(height: 16),
          CardDivider(tokens: t),
          const SizedBox(height: 10),
          Text(
            'COLLECTOR MEMORY · NO. ${data.listingNo}',
            style: monoLabel(t, size: 9.5, letterSpacing: 0.1),
          ),
        ],
      ),
    );
  }
}

/// Back side — "Collector Memory Card.dc.html" §1a-1c BACK.
class MemoryCardBack extends StatelessWidget {
  final MemoryCardData data;
  const MemoryCardBack({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final t = grookaiObjectTokens[data.skin]!;
    return GrookaiObjectFrame(
      skin: data.skin,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'COLLECTOR MEMORY',
                style: monoLabel(
                  t,
                  size: 9.5,
                  color: t.accent,
                  letterSpacing: 0.2,
                  weight: FontWeight.w600,
                ),
              ),
              Text('NO. ${data.listingNo}', style: monoLabel(t, size: 9.5)),
            ],
          ),
          const SizedBox(height: 14),
          CardDivider(tokens: t),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(Icons.calendar_month, size: 15, color: t.accent),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  _formatDate(data.date),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: t.primaryText.withValues(alpha: 0.72),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Icon(Icons.location_on, size: 15, color: t.accent),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  data.location,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: t.primaryText.withValues(alpha: 0.72),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Center(
            child: _Polaroid(skin: data.skin, imageUrl: data.photoUrl),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '"${data.storyText}"',
                    textAlign: TextAlign.center,
                    style: serifTitle(
                      t,
                      size: 17,
                    ).copyWith(fontStyle: FontStyle.italic),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '— ${data.authorName.toUpperCase()}',
                    style: monoLabel(
                      t,
                      size: 10.5,
                      color: t.accent,
                      letterSpacing: 0.08,
                    ),
                  ),
                ],
              ),
            ),
          ),
          CardDivider(tokens: t),
          const SizedBox(height: 12),
          CardFooterBrand(tokens: t),
        ],
      ),
    );
  }

  String _formatDate(DateTime d) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[d.month - 1]} ${d.day}, ${d.year}';
  }
}

/// Polaroid photo block, rotation differs per skin (-3deg Onyx, 0deg Ivory,
/// +2deg Kraft) to match the mockup exactly.
class _Polaroid extends StatelessWidget {
  final GrookaiObjectSkin skin;
  final String? imageUrl;
  const _Polaroid({required this.skin, this.imageUrl});

  @override
  Widget build(BuildContext context) {
    final rotation = switch (skin) {
      GrookaiObjectSkin.onyx => -3.0,
      GrookaiObjectSkin.kraft => 2.0,
      GrookaiObjectSkin.ivory => 0.0,
    };
    final t = grookaiObjectTokens[skin]!;
    return Transform.rotate(
      angle: rotation * 3.14159 / 180,
      child: Container(
        width: 176,
        height: 220,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: t.primaryText.withValues(alpha: 0.05),
          border: Border.all(
            color: t.primaryText.withValues(alpha: 0.9),
            width: skin == GrookaiObjectSkin.ivory ? 1 : 5,
          ),
          boxShadow: const [
            BoxShadow(
              color: Colors.black38,
              blurRadius: 30,
              offset: Offset(0, 14),
            ),
          ],
        ),
        child: imageUrl != null
            ? GrookaiObjectNetworkImage(
                imageUrl: imageUrl!,
                width: 160,
                height: 204,
                fit: BoxFit.cover,
                borderRadius: BorderRadius.zero,
              )
            : Center(
                child: Text(
                  'PHOTO —\ncollector holding card',
                  textAlign: TextAlign.center,
                  style: monoLabel(
                    t,
                    size: 9.5,
                    color: t.primaryText.withValues(alpha: 0.5),
                  ),
                ),
              ),
      ),
    );
  }
}
