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
          const SizedBox(height: 4),
          Text(
            [
              if (data.card.setLine.trim().isNotEmpty) data.card.setLine.trim(),
              data.card.printingIdentityLabel,
            ].join(' · ').toUpperCase(),
            style: monoLabel(t, size: 8.5, letterSpacing: 0.08),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
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
    final density = _MemoryBackDensity.forStory(data.storyText);
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
          if ((data.occasion ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 9),
            Row(
              children: [
                Icon(Icons.celebration_outlined, size: 15, color: t.accent),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    data.occasion!.trim(),
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
          ],
          if (density.showPhoto) ...[
            SizedBox(height: density.photoSpacing),
            Center(
              child: _Polaroid(
                skin: data.skin,
                imageUrl: data.photoUrl,
                width: density.photoWidth,
                height: density.photoHeight,
              ),
            ),
            SizedBox(height: density.photoSpacing),
          ] else
            const SizedBox(height: 14),
          Expanded(
            child: Center(
              child: _MemoryStoryBlock(data: data, tokens: t, density: density),
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

class _MemoryStoryBlock extends StatelessWidget {
  const _MemoryStoryBlock({
    required this.data,
    required this.tokens,
    required this.density,
  });

  final MemoryCardData data;
  final GrookaiObjectTokens tokens;
  final _MemoryBackDensity density;

  @override
  Widget build(BuildContext context) {
    final author = Text(
      '— ${data.authorName.toUpperCase()}',
      style: monoLabel(
        tokens,
        size: 10.5,
        color: tokens.accent,
        letterSpacing: 0.08,
      ),
    );
    if (!density.compactStory) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '"${data.storyText}"',
            textAlign: TextAlign.center,
            style: serifTitle(
              tokens,
              size: 17,
            ).copyWith(fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 10),
          author,
        ],
      );
    }
    return Column(
      children: [
        Expanded(
          child: _MemoryStoryText(
            text: data.storyText,
            tokens: tokens,
            preferredFontSize: density.storyFontSize,
          ),
        ),
        const SizedBox(height: 10),
        author,
      ],
    );
  }
}

/// Polaroid photo block, rotation differs per skin (-3deg Onyx, 0deg Ivory,
/// +2deg Kraft) to match the mockup exactly.
class _Polaroid extends StatelessWidget {
  final GrookaiObjectSkin skin;
  final String? imageUrl;
  final double width;
  final double height;
  const _Polaroid({
    required this.skin,
    this.imageUrl,
    this.width = 176,
    this.height = 220,
  });

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
        width: width,
        height: height,
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
                width: width - 16,
                height: height - 16,
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

class _MemoryStoryText extends StatelessWidget {
  const _MemoryStoryText({
    required this.text,
    required this.tokens,
    required this.preferredFontSize,
  });

  final String text;
  final GrookaiObjectTokens tokens;
  final double preferredFontSize;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final quotedText = '"$text"';
        var fontSize = preferredFontSize;
        while (fontSize > 8.5) {
          final painter = TextPainter(
            text: TextSpan(
              text: quotedText,
              style: serifTitle(
                tokens,
                size: fontSize,
              ).copyWith(fontStyle: FontStyle.italic),
            ),
            textAlign: TextAlign.center,
            textDirection: TextDirection.ltr,
          )..layout(maxWidth: constraints.maxWidth);
          if (painter.height <= constraints.maxHeight) {
            break;
          }
          fontSize -= 0.5;
        }
        return Align(
          alignment: Alignment.center,
          child: Text(
            quotedText,
            textAlign: TextAlign.center,
            style: serifTitle(
              tokens,
              size: fontSize,
            ).copyWith(fontStyle: FontStyle.italic),
          ),
        );
      },
    );
  }
}

class _MemoryBackDensity {
  const _MemoryBackDensity({
    required this.showPhoto,
    required this.photoWidth,
    required this.photoHeight,
    required this.photoSpacing,
    required this.storyFontSize,
    required this.compactStory,
  });

  final bool showPhoto;
  final double photoWidth;
  final double photoHeight;
  final double photoSpacing;
  final double storyFontSize;
  final bool compactStory;

  factory _MemoryBackDensity.forStory(String story) {
    final length = story.trim().length;
    if (length > 700) {
      return const _MemoryBackDensity(
        showPhoto: false,
        photoWidth: 0,
        photoHeight: 0,
        photoSpacing: 0,
        storyFontSize: 11,
        compactStory: true,
      );
    }
    if (length > 320) {
      return const _MemoryBackDensity(
        showPhoto: true,
        photoWidth: 104,
        photoHeight: 130,
        photoSpacing: 12,
        storyFontSize: 13,
        compactStory: true,
      );
    }
    return const _MemoryBackDensity(
      showPhoto: true,
      photoWidth: 176,
      photoHeight: 220,
      photoSpacing: 20,
      storyFontSize: 17,
      compactStory: false,
    );
  }
}
