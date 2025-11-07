import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/config/env.dart';
import 'package:grookai_vault/services/search_service_unified.dart';

// Minimal create form: title, price, set_code, pseudo image picker (no external deps)
// Note: Image picking is left as a TODO; the button stores a placeholder empty bytes
// to keep analyzer clean without adding packages. Replace with image_picker if desired.

class CreateListingPage extends StatefulWidget {
  const CreateListingPage({super.key});
  @override
  State<CreateListingPage> createState() => _CreateListingPageState();
}

class _CreateListingPageState extends State<CreateListingPage> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _price = TextEditingController();
  final _description = TextEditingController();
  final _picker = ImagePicker();
  List<XFile> _gallery = <XFile>[];
  String? _vaultItemId;
  String? _vaultImageUrl;
  bool _useVaultImage = true;
  bool _busy = false;
  bool _argsApplied = false;

  SupabaseClient get _sb => Supabase.instance.client;

  @override
  void dispose() {
    _title.dispose();
    _price.dispose();
    _description.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_argsApplied) return;
    _argsApplied = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map) {
      _vaultItemId = (args['vaultItemId'] ?? args['vault_item_id'])?.toString();
      _vaultImageUrl = (args['vaultImageUrl'] ?? args['image_url'])?.toString();
      final cardNameArg = (args['cardName'] ?? args['name'])?.toString();
      if (cardNameArg != null && cardNameArg.isNotEmpty) {
        _title.text = cardNameArg;
      }
      _useVaultImage = _vaultImageUrl != null && _vaultImageUrl!.isNotEmpty;
    }
    // If we have a vault item but no card name or image_url yet, prefill from DB
    if ((_title.text.isEmpty || _vaultImageUrl == null || _vaultImageUrl!.isEmpty) &&
        _vaultItemId != null && _vaultItemId!.isNotEmpty) {
      _prefillFromVault(_vaultItemId!);
    }
  }

  Future<void> _prefillFromVault(String vaultItemId) async {
    try {
      final sb = Supabase.instance.client;
      final vi = await sb
          .from('vault_items')
          .select('card_print_id,image_url')
          .eq('id', vaultItemId)
          .maybeSingle();
      if (vi != null) {
        final cpId = (vi['card_print_id'] ?? '').toString();
        final img = (vi['image_url'] ?? '').toString();
        if ((_vaultImageUrl == null || _vaultImageUrl!.isEmpty) && img.isNotEmpty) {
          setState(() { _vaultImageUrl = img; _useVaultImage = true; });
        }
        if (_title.text.isEmpty && cpId.isNotEmpty) {
          final row = await sb
              .from('v_card_search')
              .select('name')
              .eq('id', cpId)
              .maybeSingle();
          final nm = (row?['name'] ?? '').toString();
          if (nm.isNotEmpty) {
            setState(() { _title.text = nm; });
          }
        }
      }
    } catch (_) {
      // ignore prefill errors
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Listing')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _title,
                decoration: const InputDecoration(labelText: 'Card Name (title)'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              TextFormField(
                controller: _price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Price (cents)'),
                validator: (v) => (int.tryParse(v ?? '') == null) ? 'Enter integer cents' : null,
              ),
              TextFormField(
                controller: _description,
                decoration: const InputDecoration(labelText: 'Description (optional)'),
                minLines: 2,
                maxLines: 4,
              ),
              const SizedBox(height: 12),
              if (_vaultImageUrl != null && _vaultImageUrl!.isNotEmpty)
                SwitchListTile(
                  title: const Text('Use photo from Vault'),
                  value: _useVaultImage,
                  onChanged: _busy ? null : (v) => setState(() => _useVaultImage = v),
                  subtitle: _useVaultImage
                      ? Text(_vaultImageUrl!, maxLines: 1, overflow: TextOverflow.ellipsis)
                      : null,
                ),
              Row(children: [
                ElevatedButton(
                  onPressed: _busy ? null : _pickFromGallery,
                  child: const Text('Add photos'),
                ),
                const SizedBox(width: 12),
                if (_gallery.isNotEmpty) Text('${_gallery.length} selected'),
              ]),
              if (_gallery.isNotEmpty) ...[
                const SizedBox(height: 8),
                SizedBox(
                  height: 76,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _gallery.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (ctx, i) {
                      final f = _gallery[i];
                      return FutureBuilder<Uint8List>(
                        future: f.readAsBytes(),
                        builder: (ctx, snap) {
                          if (!snap.hasData) {
                            return const SizedBox(width: 56, height: 74, child: ColoredBox(color: Color(0x11000000)));
                          }
                          return ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.memory(
                              snap.data!,
                              width: 56,
                              height: 74,
                              fit: BoxFit.cover,
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _busy ? null : _submit,
                  child: _busy ? const CircularProgressIndicator() : const Text('Create'),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickFromGallery() async {
    final files = await _picker.pickMultiImage(imageQuality: 90);
    if (files.isNotEmpty) {
      setState(() {
        _gallery.addAll(files);
      });
    }
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _busy = true; });
    try {
      final uid = _sb.auth.currentUser?.id;
      if (uid == null) { _toast('You must be signed in'); return; }
      final priceCents = int.parse(_price.text);

      // 1) Insert listing (visibility/status defaults handled in DB or set explicitly)
      final payload = <String, dynamic>{
        'owner_id': uid,
        'title': _title.text.trim(),
        'price_cents': priceCents,
        'visibility': 'public',
        'status': 'active',
      };
      final desc = _description.text.trim();
      if (desc.isNotEmpty) payload['description'] = desc;
      if (_vaultItemId != null && _vaultItemId!.isNotEmpty) {
        payload['vault_item_id'] = _vaultItemId;
      }
      // Default primary image from Vault if chosen
      if (_useVaultImage && _vaultImageUrl != null && _vaultImageUrl!.isNotEmpty) {
        payload['primary_image_url'] = _vaultImageUrl;
      }
      final ins = await _sb.from('listings').insert(payload).select('id').limit(1);
      final listingId = (ins.first)['id'] as String;

      // 2) Upload any gallery photos and create listing_images rows
      String? firstGalleryUrl;
      for (int i = 0; i < _gallery.length; i++) {
        final x = _gallery[i];
        final bytes = await x.readAsBytes();
        final storagePath = '$uid/$listingId/${DateTime.now().millisecondsSinceEpoch}_$i.jpg';
        await _sb.storage.from('listing-photos').uploadBinary(
              storagePath,
              bytes,
              fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: true),
            );
        final publicUrl = _sb.storage.from('listing-photos').getPublicUrl(storagePath);
        firstGalleryUrl ??= publicUrl;
        await _sb.from('listing_images').insert({
          'listing_id': listingId,
          'image_url': publicUrl,
          'thumb_3x4_url': publicUrl,
          'sort_order': i,
        });
      }

      // 3) If no primary image yet and gallery had images, set primary_image_url
      if (( !_useVaultImage || _vaultImageUrl == null || _vaultImageUrl!.isEmpty ) && firstGalleryUrl != null) {
        await _sb.from('listings').update({'primary_image_url': firstGalleryUrl}).eq('id', listingId);
      }

      // 4) Trigger wall refresh (best-effort; ignore errors)
      try {
        final api = GVSearchApi(Env.supabaseUrl, Env.supabaseAnonKey);
        await api.refreshWall();
      } catch (_) {}
      // Direct DB refresh as a backup (if RPC exists locally)
      try { await _sb.rpc('rpc_refresh_wall'); } catch (_) {}

      if (mounted) {
        _toast('Listing created');
        Navigator.of(context).maybePop();
      }
    } catch (e) {
      _toast('Error: $e');
    } finally {
      if (mounted) setState(() { _busy = false; });
    }
  }

  void _toast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }
}
