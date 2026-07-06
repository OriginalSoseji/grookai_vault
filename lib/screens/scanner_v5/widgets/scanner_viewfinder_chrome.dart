import 'dart:ui';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import 'scanner_retake_toast.dart';
import 'scanner_v5_palette.dart';

class ScannerViewfinderChrome extends StatelessWidget {
  const ScannerViewfinderChrome({
    required this.onClose,
    required this.onFlashToggle,
    required this.onHistory,
    required this.onCapture,
    required this.onPhotos,
    required this.onVault,
    required this.flashEnabled,
    required this.captureEnabled,
    required this.identifying,
    this.toastTitle,
    this.toastMessage,
    super.key,
  });

  final VoidCallback onClose;
  final VoidCallback onFlashToggle;
  final VoidCallback onHistory;
  final VoidCallback onCapture;
  final VoidCallback onPhotos;
  final VoidCallback onVault;
  final bool flashEnabled;
  final bool captureEnabled;
  final bool identifying;
  final String? toastTitle;
  final String? toastMessage;

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.paddingOf(context);
    final bottom = 46 + padding.bottom;
    return Stack(
      children: [
        Positioned(
          left: 16,
          top: padding.top + 10,
          child: _GlassCircleButton(
            icon: Icons.close_rounded,
            tooltip: 'Close scanner',
            onPressed: onClose,
          ),
        ),
        Positioned(
          right: 16,
          top: padding.top + 10,
          child: Row(
            children: [
              _GlassCircleButton(
                icon: flashEnabled
                    ? Icons.flash_on_rounded
                    : Icons.flash_off_rounded,
                tooltip: 'Toggle flash',
                onPressed: onFlashToggle,
              ),
              const SizedBox(width: 10),
              _GlassCircleButton(
                icon: Icons.history_rounded,
                tooltip: 'Scan history',
                onPressed: onHistory,
              ),
            ],
          ),
        ),
        Positioned(
          left: 22,
          right: 22,
          bottom: bottom + 116,
          child: Center(
            child: _GlassPill(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    identifying
                        ? 'Reading card...'
                        : 'Fill the frame with one card',
                    style: const TextStyle(
                      color: ScannerV5Palette.text,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      height: 1,
                    ),
                  ),
                  if (!identifying) ...[
                    const SizedBox(height: 5),
                    Text(
                      'Sleeve ok. Remove top loaders if glare hits the number.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: ScannerV5Palette.dim(0.6),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                        height: 1.1,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
        if (toastTitle != null)
          Positioned(
            left: 22,
            right: 22,
            bottom: bottom + 142,
            child: ScannerRetakeToast(
              title: toastTitle!,
              message: toastMessage,
            ),
          ),
        Positioned(
          left: 24,
          right: 24,
          bottom: bottom,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _BottomTool(
                icon: Icons.photo_library_outlined,
                label: 'Photos',
                onPressed: onPhotos,
              ),
              Opacity(
                opacity: captureEnabled ? 1 : 0.28,
                child: _ShutterButton(
                  onPressed: captureEnabled ? onCapture : null,
                ),
              ),
              _BottomTool(
                icon: Icons.inventory_2_outlined,
                label: 'Vault',
                onPressed: onVault,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class ScannerIdentifyingOverlay extends StatelessWidget {
  const ScannerIdentifyingOverlay({
    required this.imageBytes,
    required this.frame,
    super.key,
  });

  final Uint8List imageBytes;
  final Rect frame;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(
          child: ColoredBox(color: ScannerV5Palette.frozenBg),
        ),
        Positioned.fromRect(
          rect: frame,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: ScannerV5Palette.blue.withValues(alpha: 0.55),
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(11),
              child: Image.memory(imageBytes, fit: BoxFit.cover),
            ),
          ),
        ),
        Positioned(
          left: 22,
          right: 22,
          top: frame.bottom + 14,
          child: const Center(
            child: _GlassPill(
              alpha: 0.7,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 15,
                    height: 15,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: ScannerV5Palette.text,
                    ),
                  ),
                  SizedBox(width: 9),
                  Text(
                    'Reading card...',
                    style: TextStyle(
                      color: ScannerV5Palette.text,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      height: 1,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ShutterButton extends StatelessWidget {
  const _ShutterButton({required this.onPressed});

  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 76,
        height: 76,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 4),
        ),
        child: Center(
          child: Container(
            width: 60,
            height: 60,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}

class _BottomTool extends StatelessWidget {
  const _BottomTool({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 74,
      child: TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(
          foregroundColor: ScannerV5Palette.text,
          padding: const EdgeInsets.symmetric(vertical: 4),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: ScannerV5Palette.dim(0.75), size: 24),
            const SizedBox(height: 5),
            Text(
              label,
              style: TextStyle(
                color: ScannerV5Palette.dim(0.55),
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                height: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GlassCircleButton extends StatelessWidget {
  const _GlassCircleButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Material(
          color: const Color(0xFF101214).withValues(alpha: 0.55),
          shape: const CircleBorder(),
          child: IconButton(
            onPressed: onPressed,
            tooltip: tooltip,
            icon: Icon(icon, size: 19),
            color: ScannerV5Palette.text,
            style: IconButton.styleFrom(
              fixedSize: const Size(34, 34),
              minimumSize: const Size(34, 34),
              maximumSize: const Size(34, 34),
              padding: EdgeInsets.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ),
      ),
    );
  }
}

class _GlassPill extends StatelessWidget {
  const _GlassPill({required this.child, this.alpha = 0.62});

  final Widget child;
  final double alpha;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: const Color(0xFF101214).withValues(alpha: alpha),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: ScannerV5Palette.hairline),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
            child: child,
          ),
        ),
      ),
    );
  }
}
