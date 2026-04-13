import 'dart:ui';

import 'package:flutter/material.dart';

class IdentityScannerBottomPanel extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String? subtitle;
  final String? supportingText;
  final String? imageUrl;
  final String? primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final Color accentColor;
  final bool showSpinner;

  const IdentityScannerBottomPanel({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.accentColor,
    this.subtitle,
    this.supportingText,
    this.imageUrl,
    this.primaryActionLabel,
    this.onPrimaryAction,
    this.showSpinner = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasImage = imageUrl != null && imageUrl!.trim().isNotEmpty;

    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: const Color(0xCC111316),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x33000000),
                blurRadius: 28,
                offset: Offset(0, 12),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (hasImage)
                  Padding(
                    padding: const EdgeInsets.only(right: 14),
                    child: _ScannerThumbnail(imageUrl: imageUrl!),
                  ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: accentColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              eyebrow,
                              style: theme.textTheme.labelMedium?.copyWith(
                                color: Colors.white.withOpacity(0.72),
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.25,
                              ),
                            ),
                          ),
                          if (showSpinner) ...[
                            const SizedBox(width: 10),
                            SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                strokeWidth: 1.8,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  accentColor,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        title,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          height: 1.04,
                        ),
                      ),
                      if (subtitle != null && subtitle!.trim().isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          subtitle!,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: Colors.white.withOpacity(0.82),
                            height: 1.28,
                          ),
                        ),
                      ],
                      if (supportingText != null &&
                          supportingText!.trim().isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Text(
                          supportingText!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.white.withOpacity(0.64),
                            height: 1.3,
                          ),
                        ),
                      ],
                      if (primaryActionLabel != null &&
                          onPrimaryAction != null) ...[
                        const SizedBox(height: 14),
                        FilledButton(
                          style: FilledButton.styleFrom(
                            backgroundColor: accentColor,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          onPressed: onPrimaryAction,
                          child: Text(primaryActionLabel!),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ScannerThumbnail extends StatelessWidget {
  final String imageUrl;

  const _ScannerThumbnail({required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: 58,
        height: 80,
        color: Colors.white.withOpacity(0.06),
        child: Image.network(
          imageUrl,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) =>
              Icon(Icons.style_rounded, color: Colors.white.withOpacity(0.72)),
        ),
      ),
    );
  }
}
