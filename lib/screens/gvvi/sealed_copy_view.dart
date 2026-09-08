import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../../services/sealed/owned_sealed_service_v1.dart';

String sealedCopyUrl(OwnedSealedCopy copy) =>
    Uri.https('grookaivault.com', '/gvvi/${copy.text('gv_vi_id')}').toString();

class SealedCopyView extends StatefulWidget {
  const SealedCopyView({
    super.key,
    required this.copy,
    this.ownerTools = false,
  });
  final OwnedSealedCopy copy;
  final bool ownerTools;
  @override
  State<SealedCopyView> createState() => _SealedCopyViewState();
}

class _SealedCopyViewState extends State<SealedCopyView> {
  late final _image = OwnedSealedService.supabase().image(widget.copy);
  late final _photos = Future.wait([
    OwnedSealedService.supabase().personalImage(widget.copy),
    OwnedSealedService.supabase().personalImage(widget.copy, back: true),
  ]);
  bool _printing = false;
  Future<void> _print() async {
    setState(() => _printing = true);
    try {
      final pdf = pw.Document();
      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a6,
          build: (_) => pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                widget.copy.name,
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 8),
              pw.Text(widget.copy.identity),
              pw.SizedBox(height: 8),
              pw.Text(
                '${widget.copy.text('seal_state')} / ${widget.copy.text('package_condition')}',
              ),
              pw.SizedBox(height: 16),
              pw.BarcodeWidget(
                barcode: pw.Barcode.qrCode(),
                data: sealedCopyUrl(widget.copy),
                width: 120,
                height: 120,
              ),
              pw.SizedBox(height: 8),
              pw.Text(widget.copy.text('gv_vi_id')),
            ],
          ),
        ),
      );
      await Printing.layoutPdf(onLayout: (_) => pdf.save());
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Print could not be prepared.')),
        );
      }
    } finally {
      if (mounted) setState(() => _printing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final copy = widget.copy;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sealed copy'),
        actions: [
          IconButton(
            tooltip: 'Share copy',
            icon: const Icon(Icons.ios_share),
            onPressed: () async {
              final box = context.findRenderObject() as RenderBox?;
              try {
                await SharePlus.instance.share(
                  ShareParams(
                    text: '${copy.identity}\n${sealedCopyUrl(copy)}',
                    sharePositionOrigin: box == null
                        ? null
                        : box.localToGlobal(Offset.zero) & box.size,
                  ),
                );
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Sharing is unavailable.')),
                  );
                }
              }
            },
          ),
          if (widget.ownerTools)
            IconButton(
              tooltip: 'Print copy QR',
              icon: const Icon(Icons.print_outlined),
              onPressed: _printing ? null : _print,
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          SizedBox(
            height: 300,
            child: FutureBuilder<String?>(
              future: _image,
              builder: (_, state) => state.data == null
                  ? const Icon(Icons.inventory_2_outlined, size: 60)
                  : CachedNetworkImage(
                      imageUrl: state.data!,
                      fit: BoxFit.contain,
                      errorWidget: (_, _, _) =>
                          const Icon(Icons.broken_image_outlined, size: 60),
                    ),
            ),
          ),
          const SizedBox(height: 16),
          FutureBuilder<List<String?>>(
            future: _photos,
            builder: (_, state) => Column(
              children: [
                for (var i = 0; i < (state.data?.length ?? 0); i++)
                  if (state.data![i] != null) ...[
                    Text(i == 0 ? 'Front photo' : 'Back photo'),
                    SizedBox(
                      height: 280,
                      child: InteractiveViewer(
                        maxScale: 5,
                        child: CachedNetworkImage(
                          imageUrl: state.data![i]!,
                          fit: BoxFit.contain,
                          errorWidget: (_, _, _) =>
                              const Icon(Icons.broken_image_outlined),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
              ],
            ),
          ),
          Text(copy.name, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(copy.identity),
          const SizedBox(height: 8),
          Text(
            '${copy.text('seal_state').replaceAll('_', ' ')} / ${copy.text('package_condition')}',
          ),
          if (copy.amount('asking_price_amount') != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                'Asking ${copy.text('asking_price_currency')} ${copy.amount('asking_price_amount')!.toStringAsFixed(2)}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          if (copy.amount('reference_market_price') != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Factory-sealed market reference: ${copy.text('market_currency')} ${copy.amount('reference_market_price')!.toStringAsFixed(2)}',
              ),
            ),
          if (widget.ownerTools) ...[
            const SizedBox(height: 20),
            Center(
              child: QrImageView(
                data: sealedCopyUrl(copy),
                size: 180,
                backgroundColor: Colors.white,
              ),
            ),
            Text(copy.text('gv_vi_id'), textAlign: TextAlign.center),
          ],
        ],
      ),
    );
  }
}
