import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/stores/storefront_service.dart';
import 'storefront_screen.dart';
import 'custom_product_management_screen.dart';

class StoreManagementScreen extends StatefulWidget {
  const StoreManagementScreen({this.service, super.key});
  final StorefrontService? service;
  @override
  State<StoreManagementScreen> createState() => _StoreManagementScreenState();
}

class _StoreManagementScreenState extends State<StoreManagementScreen> {
  late final StorefrontService _service = widget.service ?? StorefrontService();
  final _name = TextEditingController(),
      _slug = TextEditingController(),
      _description = TextEditingController(),
      _search = TextEditingController();
  StoreOwnerData? _owner;
  bool _loading = true, _saving = false, _initialized = false;
  String? _error;
  String _kind = 'all', _condition = '';
  int _offset = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_name, _slug, _description, _search]) {
      c.dispose();
    }
    if (widget.service == null) _service.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final owner = await _service.owner(
        query: _search.text,
        kind: _kind,
        condition: _condition,
        offset: _offset,
      );
      if (!mounted) return;
      if (!_initialized) {
        _name.text = owner.store?['display_name']?.toString() ?? '';
        _slug.text = owner.store?['slug']?.toString() ?? '';
        _description.text = owner.store?['description']?.toString() ?? '';
        _initialized = true;
      }
      setState(() => _owner = owner);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _change(Map<String, dynamic> action) async {
    setState(() => _saving = true);
    try {
      await _service.change(action);
      await _load();
      if (mounted) _notice('Saved.');
    } catch (e) {
      if (mounted) _notice(e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _notice(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));
  Future<void> _publish(String surface, bool publish) async {
    final destination = surface == 'web'
        ? 'the public website'
        : 'the Grookai app';
    if (publish) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Publish to $destination?'),
          content: const Text(
            'Only the sale copies you explicitly selected and that remain eligible will appear. Your existing sharing settings still apply.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Publish'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
    }
    await _change({
      'action': 'publish',
      'surface': surface,
      'publish': publish,
    });
  }

  Future<void> _select(Map<String, dynamic> item, bool selected) async {
    if (selected &&
        (_owner?.store?['app_published'] == true ||
            _owner?.store?['web_published'] == true)) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Add this copy to your published store?'),
          content: Text('${item['display_name']}\n${item['gv_vi_id']}'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Add to store'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
    }
    await _change({
      'action': 'item',
      'instance_id': item['id'],
      'selected': selected,
    });
  }

  Future<void> _upload(String kind) async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (file == null || !mounted) return;
    setState(() => _saving = true);
    try {
      await _service.uploadMedia(
        _owner!.store!['id'].toString(),
        kind,
        await file.readAsBytes(),
      );
      await _load();
    } catch (e) {
      if (mounted) _notice(e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final owner = _owner;
    final store = owner?.store;
    final canEdit = owner?.canEdit == true && !_saving;
    final inventory = owner?.inventory;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your store'),
        actions: [
          IconButton(
            tooltip: 'Refresh store',
            onPressed: _loading || _saving ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_error!, textAlign: TextAlign.center),
                    TextButton(onPressed: _load, child: const Text('Retry')),
                  ],
                ),
              ),
            )
          : owner == null
          ? const SizedBox.shrink()
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (!owner.canEdit)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Text(
                        'Store setup requires store access. Existing Vendor Mode tools remain available. Stored settings and previews are retained.',
                      ),
                    ),
                  ),
                Text(
                  'Store identity',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                TextField(
                  key: const ValueKey('store_name'),
                  controller: _name,
                  enabled: canEdit,
                  maxLength: 80,
                  decoration: const InputDecoration(
                    labelText: 'Store name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  key: const ValueKey('store_slug'),
                  controller: _slug,
                  enabled: canEdit && store?['first_published_at'] == null,
                  maxLength: 63,
                  decoration: const InputDecoration(
                    labelText: 'Store URL slug',
                    helperText:
                        'Lowercase letters, numbers, hyphens. Fixed after first publication.',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  key: const ValueKey('store_description'),
                  controller: _description,
                  enabled: canEdit,
                  maxLength: 1000,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'About your store',
                    border: OutlineInputBorder(),
                  ),
                ),
                FilledButton(
                  key: const ValueKey('store_save'),
                  onPressed: canEdit
                      ? () => _change({
                          'action': 'save',
                          'slug': _slug.text
                              .trim()
                              .toLowerCase()
                              .replaceAll(RegExp(r'[\s_]+'), '-')
                              .replaceAll(RegExp(r'-+'), '-')
                              .replaceAll(RegExp(r'^-+|-+$'), ''),
                          'display_name': _name.text.trim(),
                          'description': _description.text.trim(),
                        })
                      : null,
                  child: Text(
                    store == null
                        ? 'Create private draft'
                        : 'Save store details',
                  ),
                ),
                if (store != null) ...[
                  const SizedBox(height: 20),
                  Text(
                    'Branding',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const Text(
                    'JPEG, PNG, or WebP up to 5 MB. These images are separate from your collector profile.',
                  ),
                  Wrap(
                    spacing: 8,
                    children: [
                      OutlinedButton.icon(
                        onPressed: canEdit ? () => _upload('logo') : null,
                        icon: const Icon(Icons.add_photo_alternate_outlined),
                        label: Text(
                          store['logo_path'] == null
                              ? 'Add logo'
                              : 'Replace logo',
                        ),
                      ),
                      OutlinedButton.icon(
                        onPressed: canEdit ? () => _upload('banner') : null,
                        icon: const Icon(Icons.panorama_outlined),
                        label: Text(
                          store['banner_path'] == null
                              ? 'Add banner'
                              : 'Replace banner',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Preview and publication',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const Text(
                    'Creating a store or upgrading access never publishes inventory.',
                  ),
                  Wrap(
                    spacing: 8,
                    children: [
                      OutlinedButton(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => StorefrontScreen(
                              slug: store['slug'].toString(),
                              preview: true,
                              service: _service,
                            ),
                          ),
                        ),
                        child: const Text('Preview in app'),
                      ),
                      OutlinedButton(
                        onPressed: () async {
                          final opened = await launchUrl(
                            _service.uri(
                              '/store/${Uri.encodeComponent(store['slug'].toString())}',
                              {'preview': '1'},
                            ),
                            mode: LaunchMode.inAppBrowserView,
                          );
                          if (!opened && mounted) {
                            _notice('Could not open web preview.');
                          }
                        },
                        child: const Text('Preview on web'),
                      ),
                    ],
                  ),
                  const Text(
                    'Web preview requires signing in as this store’s owner.',
                    style: TextStyle(fontSize: 12),
                  ),
                  SwitchListTile(
                    title: const Text('Published in app'),
                    subtitle: const Text('Included with app-store access'),
                    value: store['app_published'] == true,
                    onChanged:
                        _saving ||
                            (!owner.canEdit && store['app_published'] != true)
                        ? null
                        : (v) => _publish('app', v),
                  ),
                  SwitchListTile(
                    title: const Text('Published on web'),
                    subtitle: Text(
                      '${_service.baseUrl}/store/${store['slug']}',
                    ),
                    value: store['web_published'] == true,
                    onChanged:
                        _saving ||
                            (!owner.canPublishWeb &&
                                store['web_published'] != true)
                        ? null
                        : (v) => _publish('web', v),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Store sections',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const Text(
                    'Choose existing Wall sections. Only copies explicitly selected below can appear in them.',
                  ),
                  if (owner.sections.isEmpty)
                    const Text(
                      'Create sections in Vendor Mode, then select them here.',
                    ),
                  ...owner.sections.asMap().entries.map(
                    (entry) => CheckboxListTile(
                      title: Text(entry.value['name'].toString()),
                      subtitle: entry.value['selected'] == true
                          ? DropdownButton<int>(
                              value: (entry.value['position'] as int?) ?? 0,
                              items: List.generate(
                                20,
                                (index) => DropdownMenuItem(
                                  value: index,
                                  child: Text('Position ${index + 1}'),
                                ),
                              ),
                              onChanged: canEdit
                                  ? (position) {
                                      if (position != null) {
                                        _change({
                                          'action': 'section',
                                          'section_id': entry.value['id'],
                                          'selected': true,
                                          'position': position,
                                        });
                                      }
                                    }
                                  : null,
                            )
                          : null,
                      value: entry.value['selected'] == true,
                      onChanged:
                          _saving ||
                              (!owner.canEdit &&
                                  entry.value['selected'] != true)
                          ? null
                          : (v) => _change({
                              'action': 'section',
                              'section_id': entry.value['id'],
                              'selected': v == true,
                              'position':
                                  (entry.value['position'] as int?) ??
                                  owner.sections
                                      .where((s) => s['selected'] == true)
                                      .length
                                      .clamp(0, 19),
                            }),
                    ),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: _saving
                        ? null
                        : () => Navigator.push(
                            context,
                            MaterialPageRoute<void>(
                              builder: (_) => CustomProductManagementScreen(
                                service: _service,
                                owner: owner,
                              ),
                            ),
                          ),
                    icon: const Icon(Icons.add_box_outlined),
                    label: const Text('Add or manage custom collectibles'),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Choose from catalog-connected inventory',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const Text(
                    'Prices, conditions, and availability come from your existing Vault. Adding a copy to a published store makes that copy visible there.',
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _search,
                    maxLength: 120,
                    onSubmitted: (_) {
                      _offset = 0;
                      _load();
                    },
                    decoration: InputDecoration(
                      labelText: 'Card name or GV-ID',
                      counterText: '',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        tooltip: 'Search inventory',
                        onPressed: () {
                          _offset = 0;
                          _load();
                        },
                        icon: const Icon(Icons.search),
                      ),
                    ),
                  ),
                  Wrap(
                    spacing: 12,
                    children: [
                      DropdownButton<String>(
                        value: _kind,
                        items: const [
                          DropdownMenuItem(
                            value: 'all',
                            child: Text('All cards'),
                          ),
                          DropdownMenuItem(value: 'raw', child: Text('Raw')),
                          DropdownMenuItem(
                            value: 'slab',
                            child: Text('Graded'),
                          ),
                        ],
                        onChanged: (v) {
                          if (v != null) {
                            _kind = v;
                            _offset = 0;
                            _load();
                          }
                        },
                      ),
                      DropdownButton<String>(
                        value: _condition,
                        items: ['', 'NM', 'LP', 'MP', 'HP', 'DMG']
                            .map(
                              (v) => DropdownMenuItem(
                                value: v,
                                child: Text(v.isEmpty ? 'All conditions' : v),
                              ),
                            )
                            .toList(),
                        onChanged: (v) {
                          if (v != null) {
                            _condition = v;
                            _offset = 0;
                            _load();
                          }
                        },
                      ),
                    ],
                  ),
                  if (inventory != null) ...[
                    if (inventory.items.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('No matching active copies.'),
                      ),
                    ...inventory.items.map(
                      (item) => CheckboxListTile(
                        key: ValueKey('store_copy_${item['id']}'),
                        isThreeLine: true,
                        title: Text(item['display_name'].toString()),
                        subtitle: Text(
                          '${item['gv_vi_id']} · ${item['finish_label'] ?? 'Printing unassigned'}\n${item['ineligible_reason'] ?? '${item['asking_price_currency']} ${item['asking_price_amount']} asking price'}',
                        ),
                        value: item['selected'] == true,
                        onChanged:
                            _saving ||
                                (item['selected'] != true &&
                                    (!owner.canEdit ||
                                        item['ineligible_reason'] != null))
                            ? null
                            : (v) => _select(item, v == true),
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        TextButton(
                          onPressed: inventory.offset == 0
                              ? null
                              : () {
                                  _offset = (inventory.offset - inventory.limit)
                                      .clamp(0, inventory.total);
                                  _load();
                                },
                          child: const Text('Previous'),
                        ),
                        Text('${inventory.total} copies'),
                        TextButton(
                          onPressed:
                              inventory.offset + inventory.limit >=
                                  inventory.total
                              ? null
                              : () {
                                  _offset = inventory.offset + inventory.limit;
                                  _load();
                                },
                          child: const Text('Next'),
                        ),
                      ],
                    ),
                  ],
                ],
              ],
            ),
    );
  }
}
