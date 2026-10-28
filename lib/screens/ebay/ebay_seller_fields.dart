import 'package:flutter/material.dart';
import '../../services/ebay/ebay_seller_controller.dart';

class EbaySellerSection extends StatelessWidget {
  const EbaySellerSection({
    super.key,
    required this.title,
    required this.child,
  });
  final String title;
  final Widget child;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        child,
        const SizedBox(height: 20),
        const Divider(height: 1),
      ],
    ),
  );
}

class EbaySellerFields extends StatelessWidget {
  const EbaySellerFields({
    super.key,
    required this.controller,
    required this.onChoosePhoto,
    required this.onTakePhoto,
  });
  final EbaySellerController controller;
  final VoidCallback onChoosePhoto, onTakePhoto;

  Widget _field(
    String name,
    String label,
    String value,
    ValueChanged<String> change, {
    int maxLines = 1,
    int? maxLength,
    TextInputType? keyboard,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: TextFormField(
      key: ValueKey(
        '${controller.local?.draftId}:${controller.local?.revision}:$name',
      ),
      initialValue: value,
      enabled: controller.busy == null && controller.editable,
      maxLines: maxLines,
      maxLength: maxLength,
      keyboardType: keyboard,
      decoration: InputDecoration(
        labelText: label,
        alignLabelWithHint: maxLines > 1,
      ),
      onChanged: change,
    ),
  );

  Widget _choice(
    String name,
    String label,
    List<Map<String, String>> options,
    String? value,
    ValueChanged<String?> change,
  ) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: DropdownButtonFormField<String>(
      key: ValueKey(
        '${controller.local?.draftId}:${controller.local?.revision}:$name',
      ),
      initialValue: options.any((o) => o['id'] == value) ? value : null,
      isExpanded: true,
      menuMaxHeight: 360,
      decoration: InputDecoration(labelText: label),
      hint: const Text('Choose an option'),
      items: options
          .map(
            (o) => DropdownMenuItem(
              value: o['id'],
              child: Text(
                o['label'] ?? o['id']!,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          )
          .toList(),
      onChanged: controller.busy == null && controller.editable ? change : null,
    ),
  );

  void _condition(Map<String, dynamic> patch) {
    controller.updateInput({
      'condition': {
        ...sellerMap(controller.local?.input['condition']),
        ...patch,
      },
    });
  }

  void _descriptor(String id, {List<String>? values, String? additionalInfo}) {
    final condition = sellerMap(controller.local?.input['condition']);
    final selected = sellerRows(
      condition['descriptors'],
    ).where((v) => v['id'] != id).toList();
    if ((values?.isNotEmpty ?? false) ||
        (additionalInfo?.isNotEmpty ?? false)) {
      selected.add({
        'id': id,
        'values': ?values,
        'additionalInfo': ?additionalInfo,
      });
    }
    _condition({'descriptors': selected});
  }

  Widget _readRows(BuildContext context, List<MapEntry<String, String>> rows) =>
      Column(
        children: rows
            .map(
              (row) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        row.key,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(child: Text(row.value, textAlign: TextAlign.end)),
                  ],
                ),
              ),
            )
            .toList(),
      );

  @override
  Widget build(BuildContext context) {
    final input = controller.local?.input ?? {};
    final condition = sellerMap(input['condition']);
    final metadata = controller.metadata;
    final frozen = controller.editable
        ? <String, dynamic>{}
        : sellerMap(sellerMap(controller.draft['prepared'])['reviewDetails']);
    final choices = sellerRows(metadata['conditionChoices']);
    final definition = choices
        .where((v) => v['conditionId'] == condition['conditionId'])
        .firstOrNull;
    final policies = sellerMap(metadata['policies']);
    final selectedPolicies = sellerMap(input['policies']);
    final aspects = sellerRows(metadata['aspects']);
    final requiredAspects = aspects
        .where(
          (v) => sellerMap(v['aspectConstraint'])['aspectRequired'] == true,
        )
        .toList();
    final optionalAspects = aspects
        .where(
          (v) => sellerMap(v['aspectConstraint'])['aspectRequired'] != true,
        )
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        EbaySellerSection(
          title: 'Listing details',
          child: controller.editable
              ? Column(
                  children: [
                    _field(
                      'title',
                      'Title',
                      input['title']?.toString() ?? '',
                      (v) => controller.updateInput({'title': v}),
                      maxLength: 80,
                    ),
                    _field(
                      'description',
                      'Description',
                      input['description']?.toString() ?? '',
                      (v) => controller.updateInput({'description': v}),
                      maxLines: 3,
                      maxLength: 5000,
                    ),
                    _field(
                      'price',
                      'Asking price · USD',
                      (input['priceCents'] as num? ?? 0) > 0
                          ? ((input['priceCents'] as num) / 100)
                                .toStringAsFixed(2)
                          : '',
                      (value) {
                        final raw = value.trim();
                        final parts = raw.split('.');
                        final cents =
                            RegExp(r'^\d{1,7}(?:\.\d{0,2})?$').hasMatch(raw)
                            ? int.parse(parts[0]) * 100 +
                                  int.parse(
                                    (parts.length > 1 ? parts[1] : '').padRight(
                                      2,
                                      '0',
                                    ),
                                  )
                            : 0;
                        controller.updateInput({'priceCents': cents});
                      },
                      keyboard: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      input['title']?.toString() ?? '',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      input['description']?.toString() ?? '',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
        ),
        EbaySellerSection(
          title: 'Condition & item specifics',
          child: frozen.isNotEmpty
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${frozen['condition'] ?? ''} · ${frozen['conditionDescription'] ?? ''}',
                    ),
                    const SizedBox(height: 12),
                    _readRows(context, [
                      ...sellerRows(frozen['descriptors']).map(
                        (v) => MapEntry(
                          v['name']?.toString() ?? '',
                          (v['values'] as List? ?? []).join(', '),
                        ),
                      ),
                      ...sellerMap(frozen['aspects']).entries.map(
                        (e) => MapEntry(
                          e.key,
                          (e.value as List? ?? []).join(', '),
                        ),
                      ),
                    ]),
                  ],
                )
              : metadata.isEmpty
              ? Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    onPressed:
                        controller.busy == null &&
                            controller.editable &&
                            controller.account['linked'] == true
                        ? controller.loadMetadata
                        : null,
                    icon: const Icon(Icons.tune_rounded, size: 18),
                    label: const Text('Load eBay options'),
                  ),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final descriptor in sellerRows(
                      definition?['conditionDescriptors'],
                    ))
                      _descriptorField(context, descriptor, condition),
                    _field(
                      'conditionDescription',
                      'Condition description',
                      condition['description']?.toString() ?? '',
                      (v) => _condition({'description': v}),
                      maxLines: 3,
                      maxLength: 1000,
                    ),
                    if (controller.copy['condition'] == 'DMG')
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        value: condition['damagedDisclosureConfirmed'] == true,
                        onChanged:
                            controller.busy == null && controller.editable
                            ? (v) => _condition({
                                'damagedDisclosureConfirmed': v == true,
                              })
                            : null,
                        title: const Text(
                          'I am using eBay’s lowest CCG condition and explicitly disclosing that this card is damaged.',
                        ),
                      ),
                    for (final aspect in requiredAspects)
                      _aspectField(context, aspect),
                    if (optionalAspects.isNotEmpty)
                      ExpansionTile(
                        tilePadding: EdgeInsets.zero,
                        title: const Text('More item specifics'),
                        children: [
                          for (final aspect in optionalAspects)
                            _aspectField(context, aspect),
                        ],
                      ),
                  ],
                ),
        ),
        EbaySellerSection(
          title: 'Shipping & returns',
          child: frozen.isNotEmpty
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: sellerMap(frozen['policies']).entries.map((entry) {
                    final policy = sellerMap(entry.value);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            policy['name']?.toString() ?? '',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          for (final term in policy['terms'] as List? ?? [])
                            Padding(
                              padding: const EdgeInsets.only(top: 5),
                              child: Text(
                                term.toString(),
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  }).toList(),
                )
              : metadata.isEmpty
              ? const Text(
                  'Load eBay options to choose your existing selling policies.',
                )
              : Column(
                  children: [
                    for (final kind in ['fulfillment', 'payment', 'return'])
                      _choice(
                        'policy-$kind',
                        kind == 'fulfillment'
                            ? 'Shipping policy'
                            : kind == 'payment'
                            ? 'Payment policy'
                            : 'Return policy',
                        sellerRows(policies[kind])
                            .map(
                              (p) => {
                                'id': p['${kind}PolicyId'].toString(),
                                'label':
                                    p['name']?.toString() ??
                                    p['${kind}PolicyId'].toString(),
                              },
                            )
                            .toList(),
                        selectedPolicies[kind] as String?,
                        (v) => controller.updateInput({
                          'policies': {
                            ...sellerMap(controller.local?.input['policies']),
                            kind: v ?? '',
                          },
                        }),
                      ),
                    _choice(
                      'location',
                      'Ships from',
                      sellerRows(metadata['locations'])
                          .where(
                            (v) => v['merchantLocationStatus'] == 'ENABLED',
                          )
                          .map(
                            (v) => {
                              'id': v['merchantLocationKey'].toString(),
                              'label': (v['name'] ?? v['merchantLocationKey'])
                                  .toString(),
                            },
                          )
                          .toList(),
                      input['locationKey'] as String?,
                      (v) => controller.updateInput({'locationKey': v ?? ''}),
                    ),
                  ],
                ),
        ),
        EbaySellerSection(
          title: 'Your copy photos',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (controller.editable)
                Text(
                  'Clear front, back and detail photos of this exact card. JPEG or PNG, up to 16 MB; long edge at least 600 pixels.',
                  style: TextStyle(
                    fontSize: 13,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 9,
                runSpacing: 9,
                children: [
                  for (final (index, photo) in sellerRows(
                    controller.draft['photos'],
                  ).indexed)
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: SizedBox(
                            width: 92,
                            height: 128,
                            child: ColoredBox(
                              color: Theme.of(
                                context,
                              ).colorScheme.surfaceContainerLow,
                              child: controller.photoUrls[photo['id']] is String
                                  ? Image.network(
                                      controller.photoUrls[photo['id']]!,
                                      fit: BoxFit.contain,
                                      semanticLabel:
                                          'Your copy photo ${index + 1}',
                                      errorBuilder: (_, _, _) =>
                                          const Icon(Icons.photo_outlined),
                                    )
                                  : Center(
                                      child: Text(
                                        'Photo ${index + 1}\n${photo['state'] == 'awaiting_upload'
                                            ? 'Upload pending'
                                            : photo['state'] == 'hosted'
                                            ? 'Ready'
                                            : 'Saved'}',
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                            ),
                          ),
                        ),
                        if (controller.editable)
                          TextButton(
                            onPressed: controller.busy == null
                                ? () => controller.removePhoto(
                                    photo['id'] as String,
                                  )
                                : null,
                            child: Text('Remove photo ${index + 1}'),
                          ),
                      ],
                    ),
                ],
              ),
              if (controller.editable)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Wrap(
                    spacing: 9,
                    runSpacing: 9,
                    children: [
                      OutlinedButton.icon(
                        onPressed: controller.busy == null
                            ? onChoosePhoto
                            : null,
                        icon: const Icon(
                          Icons.add_photo_alternate_outlined,
                          size: 18,
                        ),
                        label: const Text('Choose photo'),
                      ),
                      OutlinedButton.icon(
                        onPressed: controller.busy == null ? onTakePhoto : null,
                        icon: const Icon(Icons.camera_alt_outlined, size: 18),
                        label: const Text('Take photo'),
                      ),
                      if (controller.local?.pendingPhoto != null)
                        TextButton(
                          onPressed: controller.busy == null
                              ? controller.retryPhotoUpload
                              : null,
                          child: const Text('Finish interrupted upload'),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _descriptorField(
    BuildContext context,
    Map<String, dynamic> definition,
    Map<String, dynamic> condition,
  ) {
    final id = definition['conditionDescriptorId'].toString();
    final constraint = sellerMap(definition['conditionDescriptorConstraint']);
    final label =
        '${definition['conditionDescriptorName']}${constraint['usage'] == 'REQUIRED' ? ' *' : ''}';
    final selected = sellerRows(
      condition['descriptors'],
    ).where((v) => v['id'] == id).firstOrNull;
    if (constraint['mode'] == 'FREE_TEXT') {
      return _field(
        'descriptor-$id',
        label,
        selected?['additionalInfo']?.toString() ?? '',
        (v) => _descriptor(id, additionalInfo: v),
        maxLength: constraint['maxLength'] as int? ?? 100,
      );
    }
    final options = sellerRows(definition['conditionDescriptorValues'])
        .map(
          (v) => {
            'id': v['conditionDescriptorValueId'].toString(),
            'label': v['conditionDescriptorValueName'].toString(),
          },
        )
        .toList();
    final values = (selected?['values'] as List? ?? [])
        .whereType<String>()
        .toList();
    if (constraint['cardinality'] == 'MULTI') {
      return _multiple(
        context,
        label,
        options,
        values,
        (v) => _descriptor(id, values: v),
      );
    }
    return _choice(
      'descriptor-$id',
      label,
      options,
      values.firstOrNull,
      (v) => _descriptor(id, values: v == null ? [] : [v]),
    );
  }

  Widget _aspectField(BuildContext context, Map<String, dynamic> definition) {
    final name = definition['localizedAspectName'].toString();
    final constraint = sellerMap(definition['aspectConstraint']);
    final label = '$name${constraint['aspectRequired'] == true ? ' *' : ''}';
    final values =
        (sellerMap(controller.local?.input['aspects'])[name] as List? ?? [])
            .whereType<String>()
            .toList();
    void update(List<String> value) {
      final aspects = {...sellerMap(controller.local?.input['aspects'])};
      if (value.isEmpty) {
        aspects.remove(name);
      } else {
        aspects[name] = value;
      }
      controller.updateInput({'aspects': aspects});
    }

    if (constraint['aspectMode'] == 'SELECTION_ONLY') {
      final options = sellerRows(definition['aspectValues'])
          .map(
            (v) => {
              'id': v['localizedValue'].toString(),
              'label': v['localizedValue'].toString(),
            },
          )
          .toList();
      if (constraint['itemToAspectCardinality'] == 'MULTI') {
        return _multiple(context, label, options, values, update);
      }
      return _choice(
        'aspect-$name',
        label,
        options,
        values.firstOrNull,
        (v) => update(v == null ? [] : [v]),
      );
    }
    return _field(
      'aspect-$name',
      label,
      values.join('; '),
      (v) => update(
        v
            .split(';')
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toSet()
            .toList(),
      ),
      maxLength: constraint['aspectMaxLength'] as int? ?? 65,
    );
  }

  Widget _multiple(
    BuildContext context,
    String label,
    List<Map<String, String>> options,
    List<String> selected,
    ValueChanged<List<String>> change,
  ) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: OutlinedButton(
      onPressed: controller.busy != null || !controller.editable
          ? null
          : () async {
              final next = selected.toSet();
              final values = await showModalBottomSheet<List<String>>(
                context: context,
                useSafeArea: true,
                isScrollControlled: true,
                builder: (context) => StatefulBuilder(
                  builder: (context, setState) => SizedBox(
                    height: MediaQuery.sizeOf(context).height * .72,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            label,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 12),
                          Expanded(
                            child: ListView.builder(
                              itemCount: options.length,
                              itemBuilder: (_, index) {
                                final option = options[index];
                                return CheckboxListTile(
                                  value: next.contains(option['id']),
                                  title: Text(option['label']!),
                                  onChanged: (checked) => setState(() {
                                    if (checked == true) {
                                      next.add(option['id']!);
                                    } else {
                                      next.remove(option['id']);
                                    }
                                  }),
                                );
                              },
                            ),
                          ),
                          FilledButton(
                            onPressed: () =>
                                Navigator.pop(context, next.toList()),
                            child: const Text('Save selection'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
              if (values != null) change(values);
            },
      child: Align(
        alignment: Alignment.centerLeft,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            '$label\n${selected.isEmpty ? 'Choose options' : options.where((o) => selected.contains(o['id'])).map((o) => o['label']).join(', ')}',
          ),
        ),
      ),
    ),
  );
}
