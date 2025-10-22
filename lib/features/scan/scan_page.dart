import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/widgets/async_image.dart';

class ScanPage extends StatefulWidget {
  const ScanPage({super.key});
  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> {
  final supabase = Supabase.instance.client;
  bool _busy = false;

  Future<void> _captureIdentifyAndAdd() async {
    setState(() => _busy = true);
    try {
      final shot = await ImagePicker().pickImage(
        source: ImageSource.camera,
        maxWidth: 2000,
        imageQuality: 90,
      );
      if (shot == null) return;
      final file = File(shot.path);

      final uid = supabase.auth.currentUser!.id;
      final filename = '${DateTime.now().millisecondsSinceEpoch}.jpg';
      final objectPath = '$uid/intake/$filename';

      await supabase.storage.from('scans').upload(objectPath, file);

      final signedUrl =
          await supabase.storage.from('scans').createSignedUrl(objectPath, 60 * 60 * 24 * 7);

      final res = await supabase.functions.invoke('intake-scan', body: {
        'user_id': uid,
        'object_path': objectPath,
        'signed_url': signedUrl,
      });

      final data = Map<String, dynamic>.from(res.data ?? {});
      if (data.isEmpty) throw Exception('No data from intake-scan');

      final card = Map<String, dynamic>.from(data['card'] ?? {});
      final label = (data['label'] ?? '').toString();
      final price = (data['market_price'] ?? 0);

      if (!mounted) return;
      await showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Added to Vault'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                AsyncImage(
                  (card['image_url'] ?? '').toString(),
                  width: 44,
                  height: 44,
                ),
                const SizedBox(width: GVSpacing.s8),
                Expanded(
                  child: Text(
                    '${card['name'] ?? 'Card'} - ${card['set_code'] ?? ''} #${card['number'] ?? ''}',
                    maxLines: 2,
                  ),
                ),
              ]),
              const SizedBox(height: GVSpacing.s8),
              Text('Condition: $label'),
              Text('Market: \$${(price is num ? price.toStringAsFixed(2) : price.toString())}'),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Intake failed: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(GVSpacing.s16),
      children: [
        const Text(
          'Point your camera at a card. We\'ll identify it, grade condition, fetch market price, and add it to your Vault automatically.',
          style: TextStyle(fontSize: 16),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _busy ? null : _captureIdentifyAndAdd,
          icon: const Icon(Icons.camera_alt),
          label: Text(_busy ? 'Working...' : 'Scan & Add to Vault'),
        ),
        const SizedBox(height: GVSpacing.s12),
        const Text('Tip: good lighting + flat card = better ID/grade.'),
      ],
    );
  }
}

