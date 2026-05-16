import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

enum FixedSlotCaptureMode {
  one(1),
  two(2),
  four(4);

  const FixedSlotCaptureMode(this.slotCount);

  final int slotCount;
}

class FixedSlotCaptureScreen extends StatefulWidget {
  const FixedSlotCaptureScreen({super.key});

  @override
  State<FixedSlotCaptureScreen> createState() => _FixedSlotCaptureScreenState();
}

class _FixedSlotCaptureScreenState extends State<FixedSlotCaptureScreen> {
  FixedSlotCaptureMode _mode = FixedSlotCaptureMode.one;
  int _selectedSlot = 0;
  String _status = 'Slot ready';
  bool _captureRequested = false;

  void _setMode(FixedSlotCaptureMode mode) {
    if (_mode == mode) return;
    setState(() {
      _mode = mode;
      _selectedSlot = 0;
      _captureRequested = false;
      _status = 'Slot ready';
    });
    _prewarmIdentityForSelectedSlot();
  }

  void _selectSlot(int index) {
    if (_selectedSlot == index) return;
    setState(() {
      _selectedSlot = index;
      _captureRequested = false;
      _status = 'Slot ${index + 1} ready';
    });
    _prewarmIdentityForSelectedSlot();
  }

  void _prewarmIdentityForSelectedSlot() {
    // FIXED_SLOT_CAPTURE_SCANNER_V1 placeholder:
    // future work starts hidden slot-scoped ANN prewarm here.
  }

  Future<void> _captureSelectedSlot() async {
    await HapticFeedback.mediumImpact();
    if (!mounted) return;
    setState(() {
      _captureRequested = true;
      _status = 'Still capture pending';
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(child: _buildPreviewFoundation()),
            Positioned.fill(
              child: _FixedSlotOverlay(
                mode: _mode,
                selectedSlot: _selectedSlot,
                onSelectSlot: _selectSlot,
              ),
            ),
            Positioned(
              left: 20,
              right: 20,
              top: 18,
              child: _buildTopBar(context),
            ),
            Positioned(
              left: 20,
              right: 20,
              bottom: 28,
              child: _buildBottomPanel(theme),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPreviewFoundation() {
    return DecoratedBox(
      decoration: const BoxDecoration(color: Color(0xFF101010)),
      child: CustomPaint(painter: _PreviewGridPainter()),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Row(
      children: [
        IconButton.filled(
          style: IconButton.styleFrom(
            backgroundColor: Colors.black.withValues(alpha: 0.62),
            foregroundColor: Colors.white,
          ),
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.close_rounded),
          tooltip: 'Close scanner',
        ),
        const Spacer(),
        DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.62),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(4),
            child: SegmentedButton<FixedSlotCaptureMode>(
              showSelectedIcon: false,
              style: ButtonStyle(
                visualDensity: VisualDensity.compact,
                foregroundColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return Colors.black;
                  }
                  return Colors.white;
                }),
                backgroundColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return Colors.white;
                  }
                  return Colors.transparent;
                }),
                side: const WidgetStatePropertyAll(BorderSide.none),
              ),
              segments: const [
                ButtonSegment(
                  value: FixedSlotCaptureMode.one,
                  label: Text('1'),
                ),
                ButtonSegment(
                  value: FixedSlotCaptureMode.two,
                  label: Text('2'),
                ),
                ButtonSegment(
                  value: FixedSlotCaptureMode.four,
                  label: Text('4'),
                ),
              ],
              selected: <FixedSlotCaptureMode>{_mode},
              onSelectionChanged: (selection) => _setMode(selection.first),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomPanel(ThemeData theme) {
    final status = _captureRequested ? 'Still capture skeleton' : _status;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.24)),
              ),
              child: Icon(
                _captureRequested
                    ? Icons.image_search_rounded
                    : Icons.center_focus_strong_rounded,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    status,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Slot ${_selectedSlot + 1} of ${_mode.slotCount}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.white.withValues(alpha: 0.68),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            SizedBox.square(
              dimension: 70,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  padding: EdgeInsets.zero,
                  shape: const CircleBorder(),
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                ),
                onPressed: _captureSelectedSlot,
                child: const Icon(Icons.camera_alt_rounded, size: 30),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FixedSlotOverlay extends StatelessWidget {
  const _FixedSlotOverlay({
    required this.mode,
    required this.selectedSlot,
    required this.onSelectSlot,
  });

  final FixedSlotCaptureMode mode;
  final int selectedSlot;
  final ValueChanged<int> onSelectSlot;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);
        final slots = _slotRects(size, mode);
        return Stack(
          children: [
            for (var index = 0; index < slots.length; index += 1)
              Positioned.fromRect(
                rect: slots[index],
                child: _FixedSlotFrame(
                  index: index,
                  selected: index == selectedSlot,
                  onTap: () => onSelectSlot(index),
                ),
              ),
          ],
        );
      },
    );
  }

  List<Rect> _slotRects(Size size, FixedSlotCaptureMode mode) {
    final width = size.width;
    final height = size.height;
    final safeTop = 104.0;
    final safeBottom = 178.0;
    final availableHeight = (height - safeTop - safeBottom)
        .clamp(240.0, height)
        .toDouble();
    final centerY = safeTop + availableHeight / 2;

    switch (mode) {
      case FixedSlotCaptureMode.one:
        final slotWidth = width * 0.72;
        final slotHeight = slotWidth * 1.40;
        return [
          Rect.fromCenter(
            center: Offset(width / 2, centerY),
            width: slotWidth,
            height: slotHeight.clamp(260.0, availableHeight).toDouble(),
          ),
        ];
      case FixedSlotCaptureMode.two:
        final slotWidth = width * 0.40;
        final slotHeight = slotWidth * 1.40;
        return [
          Rect.fromCenter(
            center: Offset(width * 0.28, centerY),
            width: slotWidth,
            height: slotHeight.clamp(220.0, availableHeight).toDouble(),
          ),
          Rect.fromCenter(
            center: Offset(width * 0.72, centerY),
            width: slotWidth,
            height: slotHeight.clamp(220.0, availableHeight).toDouble(),
          ),
        ];
      case FixedSlotCaptureMode.four:
        final slotWidth = width * 0.34;
        final slotHeight = slotWidth * 1.40;
        final gapY = slotHeight * 0.58;
        return [
          Rect.fromCenter(
            center: Offset(width * 0.30, centerY - gapY / 2),
            width: slotWidth,
            height: slotHeight,
          ),
          Rect.fromCenter(
            center: Offset(width * 0.70, centerY - gapY / 2),
            width: slotWidth,
            height: slotHeight,
          ),
          Rect.fromCenter(
            center: Offset(width * 0.30, centerY + gapY / 2),
            width: slotWidth,
            height: slotHeight,
          ),
          Rect.fromCenter(
            center: Offset(width * 0.70, centerY + gapY / 2),
            width: slotWidth,
            height: slotHeight,
          ),
        ];
    }
  }
}

class _FixedSlotFrame extends StatelessWidget {
  const _FixedSlotFrame({
    required this.index,
    required this.selected,
    required this.onTap,
  });

  final int index;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? const Color(0xFF7BE0A3) : Colors.white70;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: CustomPaint(
        painter: _FixedSlotFramePainter(color: color, selected: selected),
        child: Align(
          alignment: Alignment.topLeft,
          child: Container(
            margin: const EdgeInsets.all(14),
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withValues(alpha: selected ? 0.88 : 0.62),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              '${index + 1}',
              style: const TextStyle(
                color: Colors.black,
                fontWeight: FontWeight.w800,
                fontSize: 18,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FixedSlotFramePainter extends CustomPainter {
  const _FixedSlotFramePainter({required this.color, required this.selected});

  final Color color;
  final bool selected;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final radius = Radius.circular(selected ? 24 : 18);
    final rrect = RRect.fromRectAndRadius(rect.deflate(2), radius);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = selected ? 4 : 2
      ..color = color.withValues(alpha: selected ? 0.95 : 0.56);
    canvas.drawRRect(rrect, paint);

    final cornerPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = selected ? 6 : 4
      ..strokeCap = StrokeCap.square
      ..color = color;
    const corner = 34.0;
    final path = Path()
      ..moveTo(0, corner)
      ..lineTo(0, 0)
      ..lineTo(corner, 0)
      ..moveTo(size.width - corner, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, corner)
      ..moveTo(size.width, size.height - corner)
      ..lineTo(size.width, size.height)
      ..lineTo(size.width - corner, size.height)
      ..moveTo(corner, size.height)
      ..lineTo(0, size.height)
      ..lineTo(0, size.height - corner);
    canvas.drawPath(path, cornerPaint);
  }

  @override
  bool shouldRepaint(covariant _FixedSlotFramePainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.selected != selected;
  }
}

class _PreviewGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.035)
      ..strokeWidth = 1;
    const step = 48.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
