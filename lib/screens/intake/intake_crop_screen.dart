part of 'intake_screens.dart';

class IntakeCropScreen extends StatefulWidget {
  const IntakeCropScreen({
    super.key,
    required this.controller,
    required this.job,
  });
  final IntakeController controller;
  final IntakeCaptureJob job;
  @override
  State<IntakeCropScreen> createState() => _IntakeCropState();
}

class _IntakeCropState extends State<IntakeCropScreen> {
  Offset? start, end;
  Size size = Size.zero;
  bool busy = false;
  late final photo = widget.controller.imageBytes(
    widget.job.imagePath,
    widget.job.remotePath,
  );
  Rect? get selection =>
      start == null || end == null ? null : Rect.fromPoints(start!, end!);
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Select one card')),
    body: FutureBuilder<Uint8List>(
      future: photo,
      builder: (_, snapshot) {
        if (!snapshot.hasData) {
          return Center(
            child: Text(
              snapshot.hasError ? 'Photo unavailable' : 'Loading photo…',
            ),
          );
        }
        return Column(
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Drag around a single full card. Check the batch for duplicates before saving.',
              ),
            ),
            Expanded(
              child: Center(
                child: AspectRatio(
                  aspectRatio: 1,
                  child: LayoutBuilder(
                    builder: (_, constraints) {
                      size = constraints.biggest;
                      return GestureDetector(
                        onPanStart: (d) =>
                            setState(() => start = end = d.localPosition),
                        onPanUpdate: (d) => setState(
                          () => end = Offset(
                            d.localPosition.dx.clamp(0, size.width),
                            d.localPosition.dy.clamp(0, size.height),
                          ),
                        ),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.memory(snapshot.data!, fit: BoxFit.fill),
                            if (selection != null)
                              Positioned.fromRect(
                                rect: selection!,
                                child: Container(
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: Colors.orange,
                                      width: 3,
                                    ),
                                    color: Colors.orange.withValues(alpha: 0.1),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed:
                    busy ||
                        selection == null ||
                        selection!.width < 20 ||
                        selection!.height < 20
                    ? null
                    : () async {
                        setState(() => busy = true);
                        try {
                          final r = selection!;
                          final bytes = await compute(
                            prepareScannerUpload,
                            <String, Object>{
                              'bytes': snapshot.data!,
                              'crop': [
                                r.left / size.width,
                                r.top / size.height,
                                r.width / size.width,
                                r.height / size.height,
                              ],
                            },
                          );
                          await widget.controller.capture(bytes);
                          if (context.mounted) Navigator.pop(context);
                        } catch (e) {
                          if (context.mounted) _error(context, e);
                        } finally {
                          if (context.mounted) setState(() => busy = false);
                        }
                      },
                child: Text(
                  busy ? 'Adding…' : 'Add selected card to scan queue',
                ),
              ),
            ),
          ],
        );
      },
    ),
  );
}
