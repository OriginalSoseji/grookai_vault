part of 'intake_screens.dart';

class IntakeBatchScreen extends StatefulWidget {
  const IntakeBatchScreen({super.key, required this.controller});
  final IntakeController controller;
  @override
  State<IntakeBatchScreen> createState() => _IntakeBatchScreenState();
}

class _IntakeBatchScreenState extends State<IntakeBatchScreen> {
  IntakeController get c => widget.controller;
  @override
  void initState() {
    super.initState();
    c.addListener(update);
    unawaited(c.resume());
  }

  void update() {
    if (context.mounted) setState(() {});
  }

  @override
  void dispose() {
    c.removeListener(update);
    c.dispose();
    super.dispose();
  }

  Future<void> capture(bool multiple) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ListenableBuilder(
          listenable: c,
          builder: (_, _) => ScanCaptureV5Screen(
            onBatchCapture: (bytes) => c.capture(bytes, multiple: multiple),
            multipleCards: multiple,
            batchCount: c.batch.copyCount,
          ),
        ),
      ),
    );
    if (mounted) setState(() {});
  }

  Future<void> import(bool multiple) async {
    try {
      final picked = await ImagePicker().pickImage(source: ImageSource.gallery);
      if (picked == null) return;
      final bytes = await compute(prepareScannerUpload, <String, Object>{
        'bytes': await picked.readAsBytes(),
        'maxDimension': multiple ? 2400 : 1200,
      });
      await c.capture(bytes, multiple: multiple);
    } catch (e) {
      if (mounted) _error(context, e);
    }
  }

  Future<void> costs() async {
    try {
      PurchaseLot? lot;
      if (c.batch.lotId != null) {
        lot = (await c.service.lots())
            .where((l) => l.id == c.batch.lotId)
            .firstOrNull;
      }
      if (!mounted) return;
      final accepted = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => IntakeCostReviewScreen(controller: c, lot: lot),
        ),
      );
      if (accepted == true && mounted) {
        await c.saveToVault();
        if (mounted) {
          _error(
            context,
            'Saved ${c.batch.items.fold<int>(0, (n, i) => n + i.savedInstanceIds.length)} copies to your Vault.',
          );
        }
      }
    } catch (e) {
      if (mounted) _error(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final batch = c.batch;
    final editable = batch.state != 'saved' && !c.busy;
    return PopScope(
      canPop: !c.busy,
      child: Scaffold(
        appBar: AppBar(
          title: Text(batch.title),
          actions: [
            IconButton(
              tooltip: 'Sync draft to your account',
              onPressed: c.busy || batch.pendingCount > 0
                  ? null
                  : () async {
                      try {
                        setState(() => c.busy = true);
                        await c.sync();
                        if (context.mounted) _error(context, 'Draft synced.');
                      } catch (e) {
                        if (context.mounted) _error(context, e);
                      } finally {
                        if (context.mounted) setState(() => c.busy = false);
                      }
                    },
              icon: const Icon(Icons.cloud_upload_outlined),
            ),
          ],
        ),
        body: AbsorbPointer(
          absorbing: c.busy,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                '${batch.copyCount} copies · ${batch.reviewCount} need review · ${batch.pendingCount} queued',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                'Acquired ${intakeDate(batch.acquiredOn)} · ${batch.currency}${batch.tags.isEmpty ? '' : ' · ${batch.tags.join(', ')}'}',
              ),
              const SizedBox(height: 12),
              if (editable)
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FilledButton.icon(
                      onPressed: () => capture(false),
                      icon: const Icon(Icons.camera_alt_outlined),
                      label: const Text('Continuous scan'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => capture(true),
                      icon: const Icon(Icons.grid_view),
                      label: const Text('Multi-card photo'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => import(true),
                      icon: const Icon(Icons.photo_library_outlined),
                      label: const Text('Import multi-card photo'),
                    ),
                    TextButton(
                      onPressed: () => import(false),
                      child: const Text('Import one card'),
                    ),
                    TextButton.icon(
                      onPressed: () async {
                        final item = IntakeItem(
                          captureId: newIntakeId(),
                          imagePath: '',
                        );
                        final selected = await Navigator.of(context)
                            .push<ScannerV5Candidate>(
                              MaterialPageRoute(
                                builder: (_) => const IntakeCardSearch(),
                              ),
                            );
                        if (selected != null) {
                          item.selected = selected;
                          batch.items.add(item);
                          await c.changed();
                          if (context.mounted) {
                            await Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) =>
                                    IntakeItemEditor(controller: c, item: item),
                              ),
                            );
                          }
                        }
                      },
                      icon: const Icon(Icons.search),
                      label: const Text('Add manually'),
                    ),
                  ],
                ),
              if (c.message != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(c.message!),
                ),
              for (final job in batch.jobs.where((j) => j.state != 'done'))
                Card(
                  child: ListTile(
                    leading: Icon(
                      job.state == 'failed'
                          ? Icons.error_outline
                          : Icons.hourglass_top,
                    ),
                    title: Text(
                      job.state == 'failed'
                          ? 'Scan needs attention'
                          : 'Identifying photo…',
                    ),
                    subtitle: Text(
                      job.error ?? 'Photo is safely saved in this draft.',
                    ),
                    trailing: job.state == 'failed' && editable
                        ? PopupMenuButton<String>(
                            onSelected: (v) async {
                              if (v == 'retry') {
                                await c.retry(job);
                              } else if (v == 'crop') {
                                await Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => IntakeCropScreen(
                                      controller: c,
                                      job: job,
                                    ),
                                  ),
                                );
                              } else {
                                job.state = 'done';
                                await c.changed();
                              }
                            },
                            itemBuilder: (_) => [
                              const PopupMenuItem(
                                value: 'retry',
                                child: Text('Retry'),
                              ),
                              const PopupMenuItem(
                                value: 'crop',
                                child: Text('Crop photo and retry'),
                              ),
                              const PopupMenuItem(
                                value: 'remove',
                                child: Text('Remove capture'),
                              ),
                            ],
                          )
                        : null,
                  ),
                ),
              for (final item in batch.items.where((i) => i.state != 'removed'))
                Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(10),
                    leading: _IntakeThumbnail(item: item, controller: c),
                    title: Text(item.selected?.name ?? 'Choose this card'),
                    subtitle: Text(
                      '${item.selected?.setCode ?? item.selected?.gvId ?? 'Choose a card'} ${item.selected?.number ?? ''} · Qty ${item.quantity}\n${item.isSaved
                          ? 'Saved · ${item.savedInstanceIds.length} copies'
                          : item.state == 'confirmed'
                          ? 'Confirmed · ${item.finishLabel ?? 'Finish unspecified'}'
                          : 'Review identity and finish'}${batch.items.any((other) => other.id != item.id && other.state != 'removed' && item.selected != null && other.selected?.cardId == item.selected!.cardId) ? '\nSame card appears elsewhere in this batch' : ''}',
                    ),
                    isThreeLine: true,
                    trailing: Icon(
                      item.isSaved
                          ? Icons.check_circle
                          : item.state == 'confirmed'
                          ? Icons.check_circle_outline
                          : Icons.edit_outlined,
                    ),
                    onTap: editable && !item.isSaved
                        ? () async {
                            await Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) =>
                                    IntakeItemEditor(controller: c, item: item),
                              ),
                            );
                            if (context.mounted) setState(() {});
                          }
                        : null,
                  ),
                ),
              if (editable &&
                  batch.jobs.any((j) => j.multiple && j.state == 'done'))
                TextButton.icon(
                  onPressed: () async {
                    final jobs = batch.jobs
                        .where((j) => j.multiple && j.state == 'done')
                        .toList();
                    final job = await showDialog<IntakeCaptureJob>(
                      context: context,
                      builder: (ctx) => SimpleDialog(
                        title: const Text('Select original photo'),
                        children: jobs
                            .map(
                              (j) => SimpleDialogOption(
                                onPressed: () => Navigator.pop(ctx, j),
                                child: Text(
                                  'Photo ${batch.jobs.indexOf(j) + 1}',
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    );
                    if (job != null && context.mounted) {
                      await Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) =>
                              IntakeCropScreen(controller: c, job: job),
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.crop),
                  label: const Text('Add a card missed in a multi-card photo'),
                ),
              const SizedBox(height: 16),
              if (editable)
                FilledButton.icon(
                  onPressed:
                      batch.items.any((i) => i.isConfirmed) &&
                          batch.pendingCount == 0
                      ? costs
                      : null,
                  icon: const Icon(Icons.price_check),
                  label: const Text('Review intake costs & save'),
                ),
              if (batch.reviewCount > 0)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'You can save confirmed cards now. Unreviewed cards stay in this draft.',
                  ),
                ),
              if (c.busy)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: LinearProgressIndicator(),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IntakeThumbnail extends StatelessWidget {
  const _IntakeThumbnail({required this.item, required this.controller});
  final IntakeItem item;
  final IntakeController controller;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 48,
    height: 68,
    child: item.imagePath.isEmpty
        ? const Icon(Icons.style_outlined)
        : FutureBuilder<Uint8List>(
            future: controller.imageBytes(item.imagePath, item.remotePath),
            builder: (_, snapshot) => snapshot.hasData
                ? Image.memory(
                    snapshot.data!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) =>
                        const Icon(Icons.broken_image_outlined),
                  )
                : const Icon(Icons.photo_outlined),
          ),
  );
}
