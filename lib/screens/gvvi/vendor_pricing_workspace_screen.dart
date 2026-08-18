import 'dart:async';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../../services/gvvi/gvvi_vendor_offer_service.dart';
import '../../services/gvvi/vendor_pricing_workspace_service.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/card_surface_price.dart';
import 'public_gvvi_screen.dart';

enum _VendorWorkspaceFilter {
  all,
  priced,
  unpriced,
  belowMarket,
  atMarket,
  aboveMarket,
  noExactMarket,
  onWall,
  offWall,
}

enum _TradeCashMode { none, received, paid }

class VendorPricingWorkspaceScreen extends StatefulWidget {
  const VendorPricingWorkspaceScreen({
    this.service = const VendorPricingWorkspaceService(),
    super.key,
  });

  final VendorPricingWorkspaceService service;

  @override
  State<VendorPricingWorkspaceScreen> createState() =>
      _VendorPricingWorkspaceScreenState();
}

class _VendorPricingWorkspaceScreenState
    extends State<VendorPricingWorkspaceScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Map<String, TextEditingController> _priceControllers = {};
  final Map<String, Timer> _saveTimers = {};
  final Set<String> _busyIds = {};
  final Map<String, String> _errors = {};
  final Set<String> _savedIds = {};

  List<VendorPricingWorkspaceRow> _rows = const [];
  List<VendorWorkspaceSection> _sections = const [];
  _VendorWorkspaceFilter _filter = _VendorWorkspaceFilter.all;
  bool _loading = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_refreshFilter);
    unawaited(_load());
  }

  @override
  void dispose() {
    _searchController
      ..removeListener(_refreshFilter)
      ..dispose();
    for (final controller in _priceControllers.values) {
      controller.dispose();
    }
    for (final timer in _saveTimers.values) {
      timer.cancel();
    }
    super.dispose();
  }

  void _refreshFilter() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final data = await widget.service.load();
      if (!mounted) {
        return;
      }
      for (final controller in _priceControllers.values) {
        controller.dispose();
      }
      _priceControllers.clear();
      for (final row in data.rows) {
        _priceControllers[row.instanceId] = TextEditingController(
          text: row.askingPrice?.toStringAsFixed(2) ?? '',
        );
      }
      setState(() {
        _rows = data.rows;
        _sections = data.sections;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _loadError = _message(error);
      });
    }
  }

  List<VendorPricingWorkspaceRow> get _visibleRows {
    final query = _searchController.text.trim().toLowerCase();
    final rows = _rows
        .where((row) {
          final matchesQuery =
              query.isEmpty ||
              row.displayName.toLowerCase().contains(query) ||
              (row.setName ?? '').toLowerCase().contains(query) ||
              (row.setCode ?? '').toLowerCase().contains(query) ||
              row.number.toLowerCase().contains(query) ||
              row.gvviId.toLowerCase().contains(query) ||
              row.printingLabel.toLowerCase().contains(query);
          if (!matchesQuery) {
            return false;
          }
          return switch (_filter) {
            _VendorWorkspaceFilter.all => true,
            _VendorWorkspaceFilter.priced => row.askingPrice != null,
            _VendorWorkspaceFilter.unpriced => row.askingPrice == null,
            _VendorWorkspaceFilter.belowMarket =>
              row.marketPosition == VendorMarketPosition.below,
            _VendorWorkspaceFilter.atMarket =>
              row.marketPosition == VendorMarketPosition.atMarket,
            _VendorWorkspaceFilter.aboveMarket =>
              row.marketPosition == VendorMarketPosition.above,
            _VendorWorkspaceFilter.noExactMarket => row.marketPrice == null,
            _VendorWorkspaceFilter.onWall => row.onWall,
            _VendorWorkspaceFilter.offWall => !row.onWall,
          };
        })
        .toList(growable: false);
    rows.sort(compareVendorWorkspaceRows);
    return rows;
  }

  int _countFor(_VendorWorkspaceFilter filter) {
    return _rows.where((row) {
      return switch (filter) {
        _VendorWorkspaceFilter.all => true,
        _VendorWorkspaceFilter.priced => row.askingPrice != null,
        _VendorWorkspaceFilter.unpriced => row.askingPrice == null,
        _VendorWorkspaceFilter.belowMarket =>
          row.marketPosition == VendorMarketPosition.below,
        _VendorWorkspaceFilter.atMarket =>
          row.marketPosition == VendorMarketPosition.atMarket,
        _VendorWorkspaceFilter.aboveMarket =>
          row.marketPosition == VendorMarketPosition.above,
        _VendorWorkspaceFilter.noExactMarket => row.marketPrice == null,
        _VendorWorkspaceFilter.onWall => row.onWall,
        _VendorWorkspaceFilter.offWall => !row.onWall,
      };
    }).length;
  }

  void _schedulePriceSave(VendorPricingWorkspaceRow row) {
    _savedIds.remove(row.instanceId);
    _errors.remove(row.instanceId);
    _saveTimers.remove(row.instanceId)?.cancel();
    _saveTimers[row.instanceId] = Timer(
      const Duration(milliseconds: 900),
      () => unawaited(_savePrice(row.instanceId)),
    );
    setState(() {});
  }

  Future<void> _savePrice(String instanceId) async {
    _saveTimers.remove(instanceId)?.cancel();
    final row = _rowById(instanceId);
    if (row == null || _busyIds.contains(instanceId)) {
      return;
    }
    final value = double.tryParse(
      (_priceControllers[instanceId]?.text ?? '').trim(),
    );
    if (value == null || !value.isFinite || value <= 0) {
      _setError(instanceId, 'Enter a price above 0');
      return;
    }

    await _runMutation(
      row,
      () => widget.service.savePrice(row: row, price: value),
      successMessage: 'Price saved and card added to Wall.',
    );
  }

  Future<void> _saveCondition(
    VendorPricingWorkspaceRow row,
    String condition,
  ) async {
    await _runMutation(
      row,
      () => widget.service.saveCondition(row: row, condition: condition),
    );
  }

  Future<void> _savePrinting(
    VendorPricingWorkspaceRow row,
    String cardPrintingId,
  ) async {
    await _runMutation(
      row,
      () =>
          widget.service.savePrinting(row: row, cardPrintingId: cardPrintingId),
      successMessage: 'Exact printing saved.',
    );
  }

  Future<void> _saveWallVisibility(
    VendorPricingWorkspaceRow row,
    bool visible,
  ) async {
    var mutationRow = row;
    if (visible) {
      final typedPrice = double.tryParse(
        (_priceControllers[row.instanceId]?.text ?? '').trim(),
      );
      if (typedPrice != null && typedPrice > 0 && typedPrice.isFinite) {
        mutationRow = row.copyWith(askingPrice: typedPrice);
      }
    }
    await _runMutation(
      row,
      () =>
          widget.service.saveWallVisibility(row: mutationRow, visible: visible),
      successMessage: visible
          ? 'Card added to Wall.'
          : 'Card removed from Wall. It remains in your Vault.',
    );
  }

  Future<void> _confirmRemove(VendorPricingWorkspaceRow row) async {
    if (_busyIds.contains(row.instanceId)) {
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove this copy?'),
        content: Text(
          '${row.displayName}\n${row.gvviId}\n\n'
          'This archives only this exact copy. It will be removed from your '
          'Vault, Wall, sections, and shared vendor links. Other copies stay '
          'in your Vault.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
              foregroundColor: Theme.of(dialogContext).colorScheme.onError,
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            icon: const Icon(Icons.delete_outline_rounded),
            label: const Text('Remove from Vault'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _busyIds.add(row.instanceId);
      _savedIds.remove(row.instanceId);
      _errors.remove(row.instanceId);
    });
    try {
      await widget.service.archiveCopy(row: row);
      if (!mounted) {
        return;
      }
      _saveTimers.remove(row.instanceId)?.cancel();
      _priceControllers.remove(row.instanceId)?.dispose();
      setState(() {
        _rows = _rows
            .where((value) => value.instanceId != row.instanceId)
            .toList(growable: false);
        _busyIds.remove(row.instanceId);
        _savedIds.remove(row.instanceId);
        _errors.remove(row.instanceId);
      });
      _showStatus('${row.displayName} removed from your Vault.');
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busyIds.remove(row.instanceId);
        _errors[row.instanceId] = _message(error);
      });
    }
  }

  Future<void> _chooseDisposition(VendorPricingWorkspaceRow row) async {
    if (_busyIds.contains(row.instanceId)) {
      return;
    }
    final submission = await showModalBottomSheet<VendorDispositionSubmission>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (sheetContext) => _DispositionSheet(row: row),
    );
    if (submission == null || !mounted) {
      return;
    }

    setState(() {
      _busyIds.add(row.instanceId);
      _savedIds.remove(row.instanceId);
      _errors.remove(row.instanceId);
    });
    try {
      await widget.service.disposeCopy(row: row, submission: submission);
      if (!mounted) {
        return;
      }
      _saveTimers.remove(row.instanceId)?.cancel();
      _priceControllers.remove(row.instanceId)?.dispose();
      setState(() {
        _rows = _rows
            .where((value) => value.instanceId != row.instanceId)
            .toList(growable: false);
        _busyIds.remove(row.instanceId);
        _savedIds.remove(row.instanceId);
        _errors.remove(row.instanceId);
      });
      _showStatus(
        '${row.displayName} marked '
        '${submission.disposition == VendorCopyDisposition.sold ? 'sold' : 'traded'}.',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busyIds.remove(row.instanceId);
        _errors[row.instanceId] = _message(error);
      });
    }
  }

  Future<void> _runMutation(
    VendorPricingWorkspaceRow row,
    Future<VendorPricingWorkspaceRow> Function() action, {
    String? successMessage,
  }) async {
    if (_busyIds.contains(row.instanceId)) {
      return;
    }
    setState(() {
      _busyIds.add(row.instanceId);
      _savedIds.remove(row.instanceId);
      _errors.remove(row.instanceId);
    });
    try {
      final saved = await action();
      if (!mounted) {
        return;
      }
      _replaceRow(saved);
      _priceControllers[row.instanceId]?.text =
          saved.askingPrice?.toStringAsFixed(2) ?? '';
      setState(() {
        _busyIds.remove(row.instanceId);
        _savedIds.add(row.instanceId);
      });
      if ((successMessage ?? '').isNotEmpty) {
        _showStatus(successMessage!);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busyIds.remove(row.instanceId);
        _errors[row.instanceId] = _message(error);
      });
    }
  }

  void _replaceRow(VendorPricingWorkspaceRow saved) {
    _rows = _rows
        .map((row) => row.instanceId == saved.instanceId ? saved : row)
        .toList(growable: false);
  }

  VendorPricingWorkspaceRow? _rowById(String instanceId) {
    for (final row in _rows) {
      if (row.instanceId == instanceId) {
        return row;
      }
    }
    return null;
  }

  void _setError(String instanceId, String message) {
    setState(() {
      _savedIds.remove(instanceId);
      _errors[instanceId] = message;
    });
  }

  Future<void> _openSections(VendorPricingWorkspaceRow row) async {
    var current = _rowById(row.instanceId) ?? row;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final theme = Theme.of(context);
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Assign sections',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      current.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    if (_sections.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Text('No custom sections yet.'),
                      )
                    else
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 340),
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: _sections.length,
                          itemBuilder: (context, index) {
                            final section = _sections[index];
                            final selected = current.sectionIds.contains(
                              section.id,
                            );
                            return CheckboxListTile(
                              key: Key(
                                'vendor_section_${current.instanceId}_${section.id}',
                              ),
                              value: selected,
                              title: Text(section.name),
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.leading,
                              onChanged: _busyIds.contains(current.instanceId)
                                  ? null
                                  : (value) async {
                                      final previous = current;
                                      try {
                                        setState(() {
                                          _busyIds.add(current.instanceId);
                                        });
                                        final saved = await widget.service
                                            .saveSectionMembership(
                                              row: current,
                                              sectionId: section.id,
                                              selected: value == true,
                                            );
                                        if (!mounted || !sheetContext.mounted) {
                                          return;
                                        }
                                        current = saved;
                                        setState(() {
                                          _replaceRow(saved);
                                          _busyIds.remove(saved.instanceId);
                                          _savedIds.add(saved.instanceId);
                                        });
                                        setSheetState(() {});
                                      } catch (error) {
                                        if (!mounted) {
                                          return;
                                        }
                                        setState(() {
                                          _busyIds.remove(previous.instanceId);
                                          _errors[previous.instanceId] =
                                              _message(error);
                                        });
                                      }
                                    },
                            );
                          },
                        ),
                      ),
                    const SizedBox(height: 8),
                    Wrap(
                      alignment: WrapAlignment.end,
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        TextButton.icon(
                          onPressed: () async {
                            final created = await _createSection();
                            if (created == null || !sheetContext.mounted) {
                              return;
                            }
                            setSheetState(() {});
                          },
                          icon: const Icon(Icons.add_rounded),
                          label: const Text('Create section'),
                        ),
                        FilledButton(
                          onPressed: () => Navigator.of(sheetContext).pop(),
                          child: const Text('Done'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<VendorWorkspaceSection?> _createSection() async {
    final controller = TextEditingController();
    try {
      final name = await showDialog<String>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Create section'),
          content: TextField(
            controller: controller,
            autofocus: true,
            maxLength: 80,
            decoration: const InputDecoration(hintText: 'Section name'),
            textInputAction: TextInputAction.done,
            onSubmitted: (value) => Navigator.of(dialogContext).pop(value),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(controller.text),
              child: const Text('Create'),
            ),
          ],
        ),
      );
      if ((name ?? '').trim().isEmpty) {
        return null;
      }
      final created = await widget.service.createSection(name!);
      if (!mounted) {
        return null;
      }
      setState(() {
        _sections = [..._sections, created]
          ..sort((left, right) => left.position.compareTo(right.position));
      });
      return created;
    } catch (error) {
      if (mounted) {
        _showStatus(_message(error));
      }
      return null;
    } finally {
      controller.dispose();
    }
  }

  Future<void> _share(VendorPricingWorkspaceRow row) async {
    if (!row.shareReady) {
      _showStatus('Set a price and publish this card for sale before sharing.');
      return;
    }
    final uri = buildPersistentGvviQrUri(row.gvviId);
    await SharePlus.instance.share(
      ShareParams(
        text: '${row.displayName}\n$uri',
        subject: '${row.displayName} vendor card',
      ),
    );
  }

  Future<void> _openVendorQr(VendorPricingWorkspaceRow row) async {
    if (!row.shareReady) {
      _showStatus(
        'Set a price and publish this card for sale before using QR.',
      );
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            PublicGvviScreen(gvviId: row.gvviId, showOwnerQrTools: true),
      ),
    );
  }

  Future<void> _previewCustomerCard(VendorPricingWorkspaceRow row) async {
    if (!row.shareReady) {
      _showStatus(
        'Set a price and publish this card for sale before previewing it.',
      );
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicGvviScreen(gvviId: row.gvviId),
      ),
    );
  }

  void _showStatus(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final visibleRows = _visibleRows;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vendor Mode'),
        actions: [
          IconButton(
            tooltip: 'Refresh inventory',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
          ? _WorkspaceState(
              title: 'Unable to load vendor inventory',
              body: _loadError!,
              onRetry: _load,
            )
          : _rows.isEmpty
          ? const _WorkspaceState(
              title: 'No vendor inventory yet',
              body: 'Add a card to your Vault to manage it here.',
            )
          : Column(
              children: [
                _WorkspaceHeader(
                  rowCount: _rows.length,
                  visibleCount: visibleRows.length,
                  searchController: _searchController,
                  selectedFilter: _filter,
                  countFor: _countFor,
                  onFilterChanged: (value) => setState(() => _filter = value),
                ),
                const Divider(height: 1),
                Expanded(
                  child: visibleRows.isEmpty
                      ? const Center(child: Text('No matching cards.'))
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(12, 10, 12, 32),
                            itemCount: visibleRows.length,
                            separatorBuilder: (_, _) =>
                                const Divider(height: 18),
                            itemBuilder: (context, index) {
                              final row = visibleRows[index];
                              return Dismissible(
                                key: Key('vendor_dismiss_${row.instanceId}'),
                                direction: DismissDirection.horizontal,
                                background: _DispositionBackground(
                                  busy: _busyIds.contains(row.instanceId),
                                ),
                                secondaryBackground: _RemoveBackground(
                                  busy: _busyIds.contains(row.instanceId),
                                ),
                                confirmDismiss: (direction) async {
                                  if (direction ==
                                      DismissDirection.startToEnd) {
                                    await _chooseDisposition(row);
                                  } else {
                                    await _confirmRemove(row);
                                  }
                                  return false;
                                },
                                child: _VendorInventoryRow(
                                  key: Key('vendor_row_${row.instanceId}'),
                                  row: row,
                                  sections: _sections,
                                  controller:
                                      _priceControllers[row.instanceId]!,
                                  busy: _busyIds.contains(row.instanceId),
                                  saved: _savedIds.contains(row.instanceId),
                                  error: _errors[row.instanceId],
                                  onPriceChanged: (_) =>
                                      _schedulePriceSave(row),
                                  onSavePrice: () => _savePrice(row.instanceId),
                                  onConditionChanged: (value) =>
                                      _saveCondition(row, value),
                                  onPrintingChanged: (value) =>
                                      _savePrinting(row, value),
                                  onWallChanged: (value) =>
                                      _saveWallVisibility(row, value),
                                  onSections: () => _openSections(row),
                                  onShare: () => _share(row),
                                  onPreview: () => _previewCustomerCard(row),
                                  onQr: () => _openVendorQr(row),
                                ),
                              );
                            },
                          ),
                        ),
                ),
              ],
            ),
    );
  }
}

class _DispositionBackground extends StatelessWidget {
  const _DispositionBackground({required this.busy});

  final bool busy;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      color: colorScheme.primary,
      padding: const EdgeInsets.symmetric(horizontal: 18),
      alignment: Alignment.centerLeft,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          busy
              ? CircularProgressIndicator(color: colorScheme.onPrimary)
              : Icon(Icons.swap_horiz_rounded, color: colorScheme.onPrimary),
          const SizedBox(height: 5),
          Text(
            busy ? 'Saving' : 'Sold / Traded',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: colorScheme.onPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _DispositionSheet extends StatefulWidget {
  const _DispositionSheet({required this.row});

  final VendorPricingWorkspaceRow row;

  @override
  State<_DispositionSheet> createState() => _DispositionSheetState();
}

class _DispositionSheetState extends State<_DispositionSheet> {
  late final TextEditingController _salePriceController;
  final TextEditingController _counterpartyController = TextEditingController();
  final TextEditingController _tradeReceivedController =
      TextEditingController();
  final TextEditingController _tradeCashController = TextEditingController();
  VendorCopyDisposition _disposition = VendorCopyDisposition.sold;
  _TradeCashMode _tradeCashMode = _TradeCashMode.none;
  String? _error;

  @override
  void initState() {
    super.initState();
    _salePriceController = TextEditingController(
      text: widget.row.askingPrice?.toStringAsFixed(2) ?? '',
    );
  }

  @override
  void dispose() {
    _salePriceController.dispose();
    _counterpartyController.dispose();
    _tradeReceivedController.dispose();
    _tradeCashController.dispose();
    super.dispose();
  }

  void _submit() {
    final counterparty = _optional(_counterpartyController.text);
    if (_disposition == VendorCopyDisposition.sold) {
      final salePrice = double.tryParse(_salePriceController.text.trim());
      if (salePrice == null || !salePrice.isFinite || salePrice <= 0) {
        setState(() => _error = 'Enter the actual sale price.');
        return;
      }
      Navigator.of(context).pop(
        VendorDispositionSubmission(
          disposition: _disposition,
          salePrice: salePrice,
          counterparty: counterparty,
        ),
      );
      return;
    }

    final received = _optional(_tradeReceivedController.text);
    if (received == null) {
      setState(() => _error = 'Enter what you received in the trade.');
      return;
    }
    double? cashAmount;
    VendorTradeCashDirection? cashDirection;
    if (_tradeCashMode != _TradeCashMode.none) {
      cashAmount = double.tryParse(_tradeCashController.text.trim());
      if (cashAmount == null || !cashAmount.isFinite || cashAmount <= 0) {
        setState(() => _error = 'Enter the cash adjustment.');
        return;
      }
      cashDirection = _tradeCashMode == _TradeCashMode.received
          ? VendorTradeCashDirection.received
          : VendorTradeCashDirection.paid;
    }
    Navigator.of(context).pop(
      VendorDispositionSubmission(
        disposition: _disposition,
        counterparty: counterparty,
        tradeReceived: received,
        tradeCashDirection: cashDirection,
        tradeCashAmount: cashAmount,
      ),
    );
  }

  String? _optional(String value) {
    final normalized = value.trim().replaceAll(RegExp(r'\s+'), ' ');
    return normalized.isEmpty ? null : normalized;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AnimatedPadding(
      duration: const Duration(milliseconds: 150),
      padding: EdgeInsets.fromLTRB(
        16,
        0,
        16,
        MediaQuery.viewInsetsOf(context).bottom + 18,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.row.displayName,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(widget.row.gvviId, style: theme.textTheme.bodySmall),
            const SizedBox(height: 14),
            SegmentedButton<VendorCopyDisposition>(
              key: const Key('vendor_disposition_type'),
              segments: const [
                ButtonSegment(
                  value: VendorCopyDisposition.sold,
                  icon: Icon(Icons.payments_outlined),
                  label: Text('Sold'),
                ),
                ButtonSegment(
                  value: VendorCopyDisposition.traded,
                  icon: Icon(Icons.swap_horiz_rounded),
                  label: Text('Traded'),
                ),
              ],
              selected: {_disposition},
              onSelectionChanged: (selected) {
                setState(() {
                  _disposition = selected.single;
                  _error = null;
                });
              },
            ),
            const SizedBox(height: 14),
            TextField(
              key: const Key('vendor_disposition_counterparty'),
              controller: _counterpartyController,
              maxLength: 120,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(
                labelText: _disposition == VendorCopyDisposition.sold
                    ? 'Buyer (optional)'
                    : 'Traded with (optional)',
                prefixIcon: const Icon(Icons.person_outline_rounded),
              ),
            ),
            if (_disposition == VendorCopyDisposition.sold)
              TextField(
                key: const Key('vendor_disposition_sale_price'),
                controller: _salePriceController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _submit(),
                decoration: const InputDecoration(
                  labelText: 'Sale price',
                  prefixText: r'$ ',
                ),
              )
            else ...[
              TextField(
                key: const Key('vendor_disposition_trade_received'),
                controller: _tradeReceivedController,
                maxLength: 1000,
                minLines: 2,
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Received in trade',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<_TradeCashMode>(
                key: const Key('vendor_disposition_trade_cash_mode'),
                initialValue: _tradeCashMode,
                decoration: const InputDecoration(labelText: 'Cash adjustment'),
                items: const [
                  DropdownMenuItem(
                    value: _TradeCashMode.none,
                    child: Text('No cash'),
                  ),
                  DropdownMenuItem(
                    value: _TradeCashMode.received,
                    child: Text('Cash received'),
                  ),
                  DropdownMenuItem(
                    value: _TradeCashMode.paid,
                    child: Text('Cash paid'),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _tradeCashMode = value;
                      _error = null;
                    });
                  }
                },
              ),
              if (_tradeCashMode != _TradeCashMode.none) ...[
                const SizedBox(height: 10),
                TextField(
                  key: const Key('vendor_disposition_trade_cash_amount'),
                  controller: _tradeCashController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _submit(),
                  decoration: const InputDecoration(
                    labelText: 'Cash amount',
                    prefixText: r'$ ',
                  ),
                ),
              ],
            ],
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(
                _error!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: 16),
            FilledButton.icon(
              key: const Key('vendor_disposition_record'),
              onPressed: _submit,
              icon: Icon(
                _disposition == VendorCopyDisposition.sold
                    ? Icons.check_circle_outline_rounded
                    : Icons.swap_horiz_rounded,
              ),
              label: Text(
                _disposition == VendorCopyDisposition.sold
                    ? 'Record sold'
                    : 'Record trade',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RemoveBackground extends StatelessWidget {
  const _RemoveBackground({required this.busy});

  final bool busy;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      color: colorScheme.error,
      padding: const EdgeInsets.symmetric(horizontal: 22),
      alignment: Alignment.centerRight,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          busy
              ? CircularProgressIndicator(color: colorScheme.onError)
              : Icon(Icons.delete_outline_rounded, color: colorScheme.onError),
          const SizedBox(height: 5),
          Text(
            busy ? 'Removing' : 'Remove',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: colorScheme.onError,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _WorkspaceHeader extends StatelessWidget {
  const _WorkspaceHeader({
    required this.rowCount,
    required this.visibleCount,
    required this.searchController,
    required this.selectedFilter,
    required this.countFor,
    required this.onFilterChanged,
  });

  final int rowCount;
  final int visibleCount;
  final TextEditingController searchController;
  final _VendorWorkspaceFilter selectedFilter;
  final int Function(_VendorWorkspaceFilter) countFor;
  final ValueChanged<_VendorWorkspaceFilter> onFilterChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '$rowCount exact ${rowCount == 1 ? 'copy' : 'copies'}',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Price, organize, publish, and share from one screen.',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 10),
          TextField(
            key: const Key('vendor_search'),
            controller: searchController,
            decoration: InputDecoration(
              hintText: 'Find a card, set, printing, or GVVI',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixText: visibleCount == rowCount ? null : '$visibleCount',
              isDense: true,
            ),
          ),
          const SizedBox(height: 9),
          _VendorFilterGroup(
            label: 'Price status',
            filters: const [
              _VendorWorkspaceFilter.all,
              _VendorWorkspaceFilter.priced,
              _VendorWorkspaceFilter.unpriced,
            ],
            selectedFilter: selectedFilter,
            countFor: countFor,
            onFilterChanged: onFilterChanged,
          ),
          const SizedBox(height: 7),
          _VendorFilterGroup(
            label: 'Market position',
            filters: const [
              _VendorWorkspaceFilter.belowMarket,
              _VendorWorkspaceFilter.atMarket,
              _VendorWorkspaceFilter.aboveMarket,
              _VendorWorkspaceFilter.noExactMarket,
            ],
            selectedFilter: selectedFilter,
            countFor: countFor,
            onFilterChanged: onFilterChanged,
          ),
          const SizedBox(height: 7),
          _VendorFilterGroup(
            label: 'Visibility',
            filters: const [
              _VendorWorkspaceFilter.onWall,
              _VendorWorkspaceFilter.offWall,
            ],
            selectedFilter: selectedFilter,
            countFor: countFor,
            onFilterChanged: onFilterChanged,
          ),
        ],
      ),
    );
  }
}

class _VendorFilterGroup extends StatelessWidget {
  const _VendorFilterGroup({
    required this.label,
    required this.filters,
    required this.selectedFilter,
    required this.countFor,
    required this.onFilterChanged,
  });

  final String label;
  final List<_VendorWorkspaceFilter> filters;
  final _VendorWorkspaceFilter selectedFilter;
  final int Function(_VendorWorkspaceFilter) countFor;
  final ValueChanged<_VendorWorkspaceFilter> onFilterChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 4),
        Wrap(
          spacing: 7,
          runSpacing: 7,
          children: filters
              .map(
                (filter) => ChoiceChip(
                  key: Key('vendor_filter_${filter.name}'),
                  selected: filter == selectedFilter,
                  label: Text('${_filterLabel(filter)} ${countFor(filter)}'),
                  onSelected: (_) => onFilterChanged(filter),
                ),
              )
              .toList(growable: false),
        ),
      ],
    );
  }
}

class _VendorInventoryRow extends StatelessWidget {
  const _VendorInventoryRow({
    required this.row,
    required this.sections,
    required this.controller,
    required this.busy,
    required this.saved,
    required this.onPriceChanged,
    required this.onSavePrice,
    required this.onConditionChanged,
    required this.onPrintingChanged,
    required this.onWallChanged,
    required this.onSections,
    required this.onShare,
    required this.onPreview,
    required this.onQr,
    this.error,
    super.key,
  });

  static const _conditions = ['NM', 'LP', 'MP', 'HP', 'DMG'];

  final VendorPricingWorkspaceRow row;
  final List<VendorWorkspaceSection> sections;
  final TextEditingController controller;
  final bool busy;
  final bool saved;
  final String? error;
  final ValueChanged<String> onPriceChanged;
  final VoidCallback onSavePrice;
  final ValueChanged<String> onConditionChanged;
  final ValueChanged<String> onPrintingChanged;
  final ValueChanged<bool> onWallChanged;
  final VoidCallback onSections;
  final VoidCallback onShare;
  final VoidCallback onPreview;
  final VoidCallback onQr;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final assignedSections = sections
        .where((section) => row.sectionIds.contains(section.id))
        .toList(growable: false);
    final condition = _conditions.contains(row.conditionLabel.toUpperCase())
        ? row.conditionLabel.toUpperCase()
        : 'NM';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 68,
              height: 95,
              child: CardSurfaceArtwork(
                label: row.displayName,
                imageUrl: row.imageUrl,
                fallbackImageUrl: row.fallbackImageUrl,
                borderRadius: 6,
                padding: EdgeInsets.zero,
                enableTapToZoom: true,
                showShadow: false,
              ),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    row.displayName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    [
                      if ((row.setName ?? '').isNotEmpty) row.setName,
                      if (row.number != '—') '#${row.number}',
                      row.printingLabel,
                    ].whereType<String>().join(' • '),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.64),
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    row.gvviId,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
            ),
            Column(
              children: [
                Checkbox(
                  key: Key('vendor_wall_${row.instanceId}'),
                  value: row.onWall,
                  onChanged: busy
                      ? null
                      : (value) => onWallChanged(value == true),
                ),
                Text('Wall', style: theme.textTheme.labelSmall),
              ],
            ),
          ],
        ),
        const SizedBox(height: 10),
        _LabeledField(
          label: 'Printing',
          child: row.isGraded
              ? const _ReadOnlyValue(value: 'Slab')
              : row.printingOptions.isEmpty
              ? const _ReadOnlyValue(value: 'No exact printings available')
              : DropdownButtonFormField<String>(
                  key: Key('vendor_printing_${row.instanceId}'),
                  initialValue: row.cardPrintingId ?? '',
                  isExpanded: true,
                  decoration: const InputDecoration(isDense: true),
                  items: [
                    const DropdownMenuItem<String>(
                      value: '',
                      child: Text('Choose exact printing'),
                    ),
                    ...row.printingOptions.map(
                      (option) => DropdownMenuItem<String>(
                        value: option.id,
                        child: Text(
                          option.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                  onChanged: busy
                      ? null
                      : (value) {
                          if (value != null &&
                              value.isNotEmpty &&
                              value != row.cardPrintingId) {
                            onPrintingChanged(value);
                          }
                        },
                ),
        ),
        const SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _LabeledField(
                label: row.isGraded ? 'Grade' : 'Condition',
                child: row.isGraded
                    ? _ReadOnlyValue(
                        value: [row.gradeCompany, row.gradeLabel]
                            .whereType<String>()
                            .where((value) => value.trim().isNotEmpty)
                            .join(' '),
                      )
                    : DropdownButtonFormField<String>(
                        key: Key('vendor_condition_${row.instanceId}'),
                        initialValue: condition,
                        isExpanded: true,
                        decoration: const InputDecoration(isDense: true),
                        items: _conditions
                            .map(
                              (value) => DropdownMenuItem(
                                value: value,
                                child: Text(value),
                              ),
                            )
                            .toList(growable: false),
                        onChanged: busy
                            ? null
                            : (value) {
                                if (value != null && value != condition) {
                                  onConditionChanged(value);
                                }
                              },
                      ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _LabeledField(
                label: 'Market',
                child: _ReadOnlyValue(
                  value: row.marketPrice == null
                      ? '—'
                      : formatCardSurfaceMoney(
                          row.marketPrice!,
                          currency: 'USD',
                        ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 2,
              child: _LabeledField(
                label: 'My price',
                child: SizedBox(
                  height: 44,
                  child: TextField(
                    key: Key('vendor_price_${row.instanceId}'),
                    controller: controller,
                    enabled: !busy,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    textInputAction: TextInputAction.done,
                    onChanged: onPriceChanged,
                    onSubmitted: (_) => onSavePrice(),
                    decoration: InputDecoration(
                      prefixText: r'$ ',
                      isDense: true,
                      suffixIcon: busy
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : IconButton(
                              tooltip: saved ? 'Saved' : 'Save price',
                              onPressed: onSavePrice,
                              icon: Icon(
                                saved
                                    ? Icons.check_circle_rounded
                                    : Icons.check_rounded,
                                color: saved ? Colors.green : null,
                              ),
                            ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 7),
        _MarketPositionLabel(row: row),
        if ((error ?? '').isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 5),
            child: Text(
              error!,
              style: theme.textTheme.labelSmall?.copyWith(
                color: colorScheme.error,
              ),
            ),
          ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: InkWell(
                key: Key('vendor_sections_${row.instanceId}'),
                onTap: busy ? null : onSections,
                borderRadius: BorderRadius.circular(6),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      const Icon(Icons.folder_outlined, size: 18),
                      const SizedBox(width: 7),
                      Expanded(
                        child: Text(
                          assignedSections.isEmpty
                              ? 'Add to section'
                              : assignedSections
                                    .map((section) => section.name)
                                    .join(', '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            IconButton(
              key: Key('vendor_share_${row.instanceId}'),
              tooltip: row.shareReady
                  ? 'Share vendor card'
                  : 'Price and publish before sharing',
              onPressed: busy ? null : onShare,
              icon: const Icon(Icons.share_outlined),
            ),
            IconButton(
              key: Key('vendor_preview_${row.instanceId}'),
              tooltip: row.shareReady
                  ? 'Preview customer card'
                  : 'Price and publish before previewing',
              onPressed: busy ? null : onPreview,
              icon: const Icon(Icons.visibility_outlined),
            ),
            IconButton(
              key: Key('vendor_qr_${row.instanceId}'),
              tooltip: row.shareReady
                  ? 'Open personal QR tools'
                  : 'Price and publish before QR',
              onPressed: busy ? null : onQr,
              icon: const Icon(Icons.qr_code_2_rounded),
            ),
          ],
        ),
      ],
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 3),
        child,
      ],
    );
  }
}

class _ReadOnlyValue extends StatelessWidget {
  const _ReadOnlyValue({required this.value});

  final String value;

  @override
  Widget build(BuildContext context) {
    final display = value.trim().isEmpty ? '—' : value;
    return Container(
      height: 44,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 9),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        display,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(
          context,
        ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _MarketPositionLabel extends StatelessWidget {
  const _MarketPositionLabel({required this.row});

  final VendorPricingWorkspaceRow row;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final amount = row.varianceAmount;
    final percent = row.variancePercent;
    final (icon, text, color) = switch (row.marketPosition) {
      VendorMarketPosition.below => (
        Icons.south_east_rounded,
        '${percent!.abs().toStringAsFixed(0)}% below market • ${formatCardSurfaceMoney(amount!.abs())} below',
        Colors.green.shade700,
      ),
      VendorMarketPosition.above => (
        Icons.north_east_rounded,
        '${percent!.abs().toStringAsFixed(0)}% above market • ${formatCardSurfaceMoney(amount!.abs())} above',
        colorScheme.tertiary,
      ),
      VendorMarketPosition.atMarket => (
        Icons.horizontal_rule_rounded,
        'At market reference',
        colorScheme.primary,
      ),
      VendorMarketPosition.unpriced => (
        Icons.edit_outlined,
        row.marketPrice == null ? 'Unpriced • No exact market' : 'Unpriced',
        colorScheme.onSurface.withValues(alpha: 0.58),
      ),
      VendorMarketPosition.noExactMarket => (
        Icons.info_outline_rounded,
        'No exact market',
        colorScheme.onSurface.withValues(alpha: 0.58),
      ),
    };
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class _WorkspaceState extends StatelessWidget {
  const _WorkspaceState({
    required this.title,
    required this.body,
    this.onRetry,
  });

  final String title;
  final String body;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 7),
            Text(body, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

String _filterLabel(_VendorWorkspaceFilter filter) => switch (filter) {
  _VendorWorkspaceFilter.all => 'All',
  _VendorWorkspaceFilter.priced => 'Priced',
  _VendorWorkspaceFilter.unpriced => 'Unpriced',
  _VendorWorkspaceFilter.belowMarket => 'Below',
  _VendorWorkspaceFilter.atMarket => 'At market',
  _VendorWorkspaceFilter.aboveMarket => 'Above',
  _VendorWorkspaceFilter.noExactMarket => 'No market',
  _VendorWorkspaceFilter.onWall => 'On Wall',
  _VendorWorkspaceFilter.offWall => 'Off Wall',
};

String _message(Object error) =>
    error.toString().replaceFirst('Exception: ', '').trim();
