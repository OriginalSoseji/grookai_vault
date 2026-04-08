import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/public/card_surface_pricing_service.dart';
import '../../services/vault/vault_card_service.dart';
import '../../widgets/card_surface_price.dart';
import '../public_collector/public_collector_screen.dart';
import 'vault_gvvi_screen.dart';

enum _ManageCardPriceMode { grookai, myPrice, hidden }

class VaultManageCardScreen extends StatefulWidget {
  const VaultManageCardScreen({
    super.key,
    required this.vaultItemId,
    required this.cardPrintId,
    required this.ownedCount,
    this.gvviId,
    this.gvId,
    this.name,
    this.setName,
    this.number,
    this.imageUrl,
    this.condition,
  });

  final String vaultItemId;
  final String cardPrintId;
  final int ownedCount;
  final String? gvviId;
  final String? gvId;
  final String? name;
  final String? setName;
  final String? number;
  final String? imageUrl;
  final String? condition;

  @override
  State<VaultManageCardScreen> createState() => _VaultManageCardScreenState();
}

class _VaultManageCardScreenState extends State<VaultManageCardScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final TextEditingController _publicNoteController = TextEditingController();
  final TextEditingController _manualPriceController = TextEditingController();

  VaultManageCardData? _data;
  CardSurfacePricingData? _pricing;
  bool _loading = true;
  bool _shareSaving = false;
  bool _noteSaving = false;
  bool _priceSaving = false;
  _ManageCardPriceMode _selectedPriceMode = _ManageCardPriceMode.grookai;
  String? _error;
  String? _statusMessage;
  String? _priceError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _publicNoteController.dispose();
    _manualPriceController.dispose();
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
      final data = await VaultCardService.loadManageCard(
        client: _client,
        vaultItemId: widget.vaultItemId,
        cardPrintId: widget.cardPrintId,
        fallbackOwnedCount: widget.ownedCount,
        fallbackGvviId: widget.gvviId,
        fallbackGvId: widget.gvId,
        fallbackName: widget.name,
        fallbackSetName: widget.setName,
        fallbackNumber: widget.number,
        fallbackImageUrl: widget.imageUrl,
      );
      final pricingById = await CardSurfacePricingService.fetchByCardPrintIds(
        client: _client,
        cardPrintIds: <String>[widget.cardPrintId],
      );
      final pricing = pricingById[widget.cardPrintId];

      if (!mounted) {
        return;
      }

      _applyLoadedState(data, pricing);
      setState(() {
        _data = data;
        _pricing = pricing;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = error is Error
            ? error.toString()
            : 'Unable to load this card.';
        _loading = false;
      });
    }
  }

  Future<void> _toggleWall() async {
    final data = _data;
    if (data == null || _shareSaving) {
      return;
    }

    setState(() {
      _shareSaving = true;
      _statusMessage = null;
    });

    try {
      final nextShared = await VaultCardService.setSharedCardVisibility(
        client: _client,
        cardPrintId: data.cardPrintId,
        gvId: data.gvId ?? '',
        nextShared: !data.isShared,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _data = VaultManageCardData(
          vaultItemId: data.vaultItemId,
          cardPrintId: data.cardPrintId,
          gvId: data.gvId,
          name: data.name,
          setName: data.setName,
          setCode: data.setCode,
          number: data.number,
          rarity: data.rarity,
          imageUrl: data.imageUrl,
          totalCopies: data.totalCopies,
          rawCount: data.rawCount,
          slabCount: data.slabCount,
          inPlayCount: data.inPlayCount,
          isShared: nextShared,
          wallCategory: nextShared ? data.wallCategory : null,
          publicNote: nextShared ? data.publicNote : null,
          publicSlug: data.publicSlug,
          priceDisplayMode: nextShared ? data.priceDisplayMode : null,
          primarySharedGvviId: data.primarySharedGvviId,
          askingPriceAmount: data.askingPriceAmount,
          askingPriceCurrency: data.askingPriceCurrency,
          publicProfileEnabled: data.publicProfileEnabled,
          vaultSharingEnabled: data.vaultSharingEnabled,
          copies: data.copies,
        );
        if (!nextShared) {
          _publicNoteController.clear();
          _priceError = null;
        }
        _statusMessage = nextShared ? 'Added to wall.' : 'Removed from wall.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() {
          _shareSaving = false;
        });
      }
    }
  }

  Future<void> _saveWallCategory(String? value) async {
    final data = _data;
    if (data == null || !data.isShared) {
      return;
    }

    try {
      final nextCategory = await VaultCardService.saveSharedCardWallCategory(
        client: _client,
        cardPrintId: data.cardPrintId,
        wallCategory: value,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _data = VaultManageCardData(
          vaultItemId: data.vaultItemId,
          cardPrintId: data.cardPrintId,
          gvId: data.gvId,
          name: data.name,
          setName: data.setName,
          setCode: data.setCode,
          number: data.number,
          rarity: data.rarity,
          imageUrl: data.imageUrl,
          totalCopies: data.totalCopies,
          rawCount: data.rawCount,
          slabCount: data.slabCount,
          inPlayCount: data.inPlayCount,
          isShared: data.isShared,
          wallCategory: nextCategory,
          publicNote: data.publicNote,
          publicSlug: data.publicSlug,
          priceDisplayMode: data.priceDisplayMode,
          primarySharedGvviId: data.primarySharedGvviId,
          askingPriceAmount: data.askingPriceAmount,
          askingPriceCurrency: data.askingPriceCurrency,
          publicProfileEnabled: data.publicProfileEnabled,
          vaultSharingEnabled: data.vaultSharingEnabled,
          copies: data.copies,
        );
        _statusMessage = 'Wall category saved.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _savePublicNote() async {
    final data = _data;
    if (data == null || !data.isShared || _noteSaving) {
      return;
    }

    setState(() {
      _noteSaving = true;
      _statusMessage = null;
    });

    try {
      final nextNote = await VaultCardService.saveSharedCardPublicNote(
        client: _client,
        cardPrintId: data.cardPrintId,
        note: _publicNoteController.text,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _data = VaultManageCardData(
          vaultItemId: data.vaultItemId,
          cardPrintId: data.cardPrintId,
          gvId: data.gvId,
          name: data.name,
          setName: data.setName,
          setCode: data.setCode,
          number: data.number,
          rarity: data.rarity,
          imageUrl: data.imageUrl,
          totalCopies: data.totalCopies,
          rawCount: data.rawCount,
          slabCount: data.slabCount,
          inPlayCount: data.inPlayCount,
          isShared: data.isShared,
          wallCategory: data.wallCategory,
          publicNote: nextNote,
          publicSlug: data.publicSlug,
          priceDisplayMode: data.priceDisplayMode,
          primarySharedGvviId: data.primarySharedGvviId,
          askingPriceAmount: data.askingPriceAmount,
          askingPriceCurrency: data.askingPriceCurrency,
          publicProfileEnabled: data.publicProfileEnabled,
          vaultSharingEnabled: data.vaultSharingEnabled,
          copies: data.copies,
        );
        _publicNoteController.text = nextNote ?? '';
        _statusMessage = 'Wall note saved.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() {
          _noteSaving = false;
        });
      }
    }
  }

  void _applyLoadedState(
    VaultManageCardData data,
    CardSurfacePricingData? pricing,
  ) {
    _publicNoteController.text = data.publicNote ?? '';
    _manualPriceController.text = _formatManualPrice(data.askingPriceAmount);
    _selectedPriceMode = switch (data.priceDisplayMode) {
      'my_price' => _ManageCardPriceMode.myPrice,
      'hidden' => _ManageCardPriceMode.hidden,
      _ => _ManageCardPriceMode.grookai,
    };
    _priceError = null;
    _pricing = pricing;
  }

  Future<void> _savePriceDisplay() async {
    final data = _data;
    if (data == null || !data.isShared || _priceSaving) {
      return;
    }

    final persistedMode = switch (_selectedPriceMode) {
      _ManageCardPriceMode.grookai => 'grookai',
      _ManageCardPriceMode.myPrice => 'my_price',
      _ManageCardPriceMode.hidden => 'hidden',
    };
    final askingPriceAmount = _selectedPriceMode == _ManageCardPriceMode.myPrice
        ? _parseManualPrice(_manualPriceController.text)
        : null;

    if (_selectedPriceMode == _ManageCardPriceMode.myPrice &&
        askingPriceAmount == null) {
      setState(() {
        _priceError = 'Enter a valid price to use My Price.';
      });
      return;
    }

    setState(() {
      _priceSaving = true;
      _priceError = null;
      _statusMessage = null;
    });

    try {
      final result = await VaultCardService.saveSharedCardPriceDisplay(
        client: _client,
        cardPrintId: data.cardPrintId,
        priceDisplayMode: persistedMode,
        primarySharedGvviId: data.primarySharedGvviId,
        askingPriceAmount: askingPriceAmount,
        askingPriceCurrency: 'USD',
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _data = VaultManageCardData(
          vaultItemId: data.vaultItemId,
          cardPrintId: data.cardPrintId,
          gvId: data.gvId,
          name: data.name,
          setName: data.setName,
          setCode: data.setCode,
          number: data.number,
          rarity: data.rarity,
          imageUrl: data.imageUrl,
          totalCopies: data.totalCopies,
          rawCount: data.rawCount,
          slabCount: data.slabCount,
          inPlayCount: data.inPlayCount,
          isShared: data.isShared,
          wallCategory: data.wallCategory,
          publicNote: data.publicNote,
          publicSlug: data.publicSlug,
          priceDisplayMode: result.priceDisplayMode,
          primarySharedGvviId: data.primarySharedGvviId,
          askingPriceAmount: result.askingPriceAmount ?? data.askingPriceAmount,
          askingPriceCurrency:
              result.askingPriceCurrency ?? data.askingPriceCurrency,
          publicProfileEnabled: data.publicProfileEnabled,
          vaultSharingEnabled: data.vaultSharingEnabled,
          copies: data.copies,
        );
        if (result.askingPriceAmount != null) {
          _manualPriceController.text = _formatManualPrice(
            result.askingPriceAmount,
          );
        }
        _statusMessage = 'Price display saved.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() {
          _priceSaving = false;
        });
      }
    }
  }

  String _formatManualPrice(double? amount) {
    if (amount == null || !amount.isFinite) {
      return '';
    }
    return amount.toStringAsFixed(2);
  }

  double? _parseManualPrice(String value) {
    final normalized = value.replaceAll(RegExp(r'[^0-9.]'), '').trim();
    if (normalized.isEmpty) {
      return null;
    }
    final parsed = double.tryParse(normalized);
    if (parsed == null || !parsed.isFinite || parsed < 0) {
      return null;
    }
    return double.parse(parsed.toStringAsFixed(2));
  }

  String _selectedPriceModeValue() {
    return switch (_selectedPriceMode) {
      _ManageCardPriceMode.grookai => 'grookai',
      _ManageCardPriceMode.myPrice => 'my_price',
      _ManageCardPriceMode.hidden => 'hidden',
    };
  }

  bool _moneyEquals(double? left, double? right) {
    if (left == null && right == null) {
      return true;
    }
    if (left == null || right == null) {
      return false;
    }
    return (left - right).abs() < 0.005;
  }

  void _showStatus(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _openCardDetail() async {
    final data = _data;
    if (data == null) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: data.cardPrintId,
          gvId: data.gvId,
          name: data.name,
          setName: data.setName,
          setCode: data.setCode,
          number: data.number,
          rarity: data.rarity,
          imageUrl: data.imageUrl,
          quantity: data.totalCopies,
          condition: data.copies.length == 1
              ? data.copies.first.conditionLabel
              : widget.condition,
          exactCopyGvviId: data.copies.length == 1
              ? data.copies.first.gvviId
              : null,
          exactCopyOwnerUserId: _client.auth.currentUser?.id,
        ),
      ),
    );
  }

  Future<void> _openExactCopy(VaultManageCardCopy copy) async {
    final gvviId = (copy.gvviId ?? '').trim();
    if (gvviId.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => VaultGvviScreen(gvviId: gvviId)),
    );
    if (mounted) {
      await _load();
    }
  }

  Future<void> _openWall() async {
    final slug = _data?.publicSlug;
    if (slug == null || slug.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicCollectorScreen(slug: slug),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final data = _data;

    return Scaffold(
      appBar: AppBar(title: const Text('Manage Card')),
      body: SafeArea(
        bottom: false,
        child: _loading && data == null
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
                  children: [
                    if (_error != null)
                      _ManageSurface(
                        child: Text(
                          _error!,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: colorScheme.error,
                          ),
                        ),
                      )
                    else if (data != null) ...[
                      _buildHero(theme, colorScheme, data),
                      const SizedBox(height: 12),
                      _buildWallSettings(theme, colorScheme, data),
                      const SizedBox(height: 12),
                      _buildCopiesSection(theme, colorScheme, data),
                    ],
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildHero(
    ThemeData theme,
    ColorScheme colorScheme,
    VaultManageCardData data,
  ) {
    final subtitleParts = <String>[
      data.setName,
      if ((data.number ?? '').isNotEmpty) '#${data.number}',
    ];
    final manualPreviewPrice =
        _selectedPriceMode == _ManageCardPriceMode.myPrice
        ? _parseManualPrice(_manualPriceController.text)
        : null;
    final hasGrookaiPrice = _pricing?.visibleValue != null;
    final heroPricePill = switch (_selectedPriceMode) {
      _ManageCardPriceMode.grookai when hasGrookaiPrice => CardSurfacePricePill(
        pricing: _pricing,
        size: CardSurfacePriceSize.list,
        mode: CardSurfacePriceMode.grookai,
      ),
      _ManageCardPriceMode.myPrice when manualPreviewPrice != null =>
        CardSurfacePricePill(
          size: CardSurfacePriceSize.list,
          mode: CardSurfacePriceMode.manual,
          manualPrice: manualPreviewPrice,
          manualCurrency: data.askingPriceCurrency ?? 'USD',
        ),
      _ => null,
    };
    final hasPublicNote = (data.publicNote ?? '').trim().isNotEmpty;

    return _ManageSurface(
      emphasize: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _CardThumb(imageUrl: data.imageUrl, size: 108),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _PillLabel(
                      label: data.isShared ? 'On Wall' : 'Private',
                      tone: data.isShared
                          ? colorScheme.primary
                          : colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      data.name,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.4,
                        height: 1.05,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitleParts.join(' • '),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.72),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if ((data.rarity ?? '').isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          if ((data.rarity ?? '').isNotEmpty)
                            _MetaChip(
                              label: _formatRarity(data.rarity!),
                              tone: colorScheme.secondary,
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (heroPricePill != null || hasPublicNote) ...[
            const SizedBox(height: 14),
            if (heroPricePill != null) ...[
              Text(
                'Wall card price',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10),
              Align(alignment: Alignment.centerLeft, child: heroPricePill),
            ],
            if (hasPublicNote) ...[
              const SizedBox(height: 10),
              Text(
                data.publicNote!.trim(),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.74),
                  fontStyle: FontStyle.italic,
                  height: 1.35,
                ),
              ),
            ],
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _CountChip(label: '${data.totalCopies} total'),
              _CountChip(label: '${data.rawCount} raw'),
              _CountChip(label: '${data.slabCount} slab'),
              _CountChip(label: '${data.inPlayCount} in play'),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: _openCardDetail,
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 42),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: const Icon(Icons.visibility_outlined),
                label: const Text('View card'),
              ),
              OutlinedButton.icon(
                onPressed: _shareSaving ? null : _toggleWall,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 42),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: _shareSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(
                        data.isShared
                            ? Icons.public_off_outlined
                            : Icons.public_outlined,
                      ),
                label: Text(data.isShared ? 'Remove from Wall' : 'Add to Wall'),
              ),
              if (data.canViewWall)
                OutlinedButton.icon(
                  onPressed: _openWall,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 42),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  icon: const Icon(Icons.open_in_new_rounded),
                  label: const Text('View wall'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWallSettings(
    ThemeData theme,
    ColorScheme colorScheme,
    VaultManageCardData data,
  ) {
    final currentMode = _selectedPriceModeValue();
    final persistedMode =
        normalizeSharedCardPriceDisplayMode(data.priceDisplayMode) ?? 'grookai';
    final manualPrice = _selectedPriceMode == _ManageCardPriceMode.myPrice
        ? _parseManualPrice(_manualPriceController.text)
        : null;
    final noteChanged =
        _publicNoteController.text.trim() != (data.publicNote ?? '');
    final canUseManualPrice = (data.primarySharedGvviId ?? '')
        .trim()
        .isNotEmpty;
    final priceChanged =
        currentMode != persistedMode ||
        (currentMode == 'my_price' &&
            !_moneyEquals(manualPrice, data.askingPriceAmount));

    return _ManageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Public / Wall',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            data.isShared
                ? 'Grouped-card presentation lives here.'
                : 'Add this card to your wall to assign a category or public note.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.3,
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: data.wallCategory ?? '',
            decoration: const InputDecoration(
              labelText: 'Wall Category',
              isDense: true,
            ),
            items: [
              const DropdownMenuItem<String>(
                value: '',
                child: Text('No category'),
              ),
              ...kWallCategoryOptions.map(
                (option) => DropdownMenuItem<String>(
                  value: option.value,
                  child: Text(option.label),
                ),
              ),
            ],
            onChanged: data.isShared
                ? (value) {
                    _saveWallCategory((value ?? '').isEmpty ? null : value);
                  }
                : null,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _publicNoteController,
            enabled: data.isShared && !_noteSaving,
            minLines: 3,
            maxLines: 5,
            onChanged: (_) {
              if (mounted) {
                setState(() {});
              }
            },
            decoration: const InputDecoration(
              labelText: 'Wall Note',
              hintText: 'Add a collector-facing note for this grouped card.',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Price Display',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Choose whether the wall card shows Grookai pricing, your own asking price, or no price.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.3,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Use Grookai Price'),
                selected: _selectedPriceMode == _ManageCardPriceMode.grookai,
                onSelected: data.isShared
                    ? (_) {
                        setState(() {
                          _selectedPriceMode = _ManageCardPriceMode.grookai;
                          _priceError = null;
                        });
                      }
                    : null,
              ),
              ChoiceChip(
                label: const Text('Use My Price'),
                selected: _selectedPriceMode == _ManageCardPriceMode.myPrice,
                onSelected: data.isShared && canUseManualPrice
                    ? (_) {
                        setState(() {
                          _selectedPriceMode = _ManageCardPriceMode.myPrice;
                          _priceError = null;
                        });
                      }
                    : null,
              ),
              ChoiceChip(
                label: const Text('Hide Price'),
                selected: _selectedPriceMode == _ManageCardPriceMode.hidden,
                onSelected: data.isShared
                    ? (_) {
                        setState(() {
                          _selectedPriceMode = _ManageCardPriceMode.hidden;
                          _priceError = null;
                        });
                      }
                    : null,
              ),
            ],
          ),
          if (_selectedPriceMode == _ManageCardPriceMode.myPrice) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _manualPriceController,
              enabled: data.isShared && canUseManualPrice && !_priceSaving,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              textInputAction: TextInputAction.done,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
              ],
              onChanged: (_) {
                if (mounted) {
                  setState(() {
                    _priceError = null;
                  });
                }
              },
              decoration: InputDecoration(
                labelText: 'Your Price',
                hintText: '0.00',
                prefixText: '\$',
                errorText: _priceError,
              ),
            ),
          ] else if (_priceError != null) ...[
            const SizedBox(height: 8),
            Text(
              _priceError!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.error,
              ),
            ),
          ],
          if (!canUseManualPrice) ...[
            const SizedBox(height: 8),
            Text(
              'My Price becomes available once this card has an exact copy to anchor the asking price.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
                height: 1.3,
              ),
            ),
          ],
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton(
                onPressed: data.isShared && !_noteSaving && noteChanged
                    ? _savePublicNote
                    : null,
                child: _noteSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Save note'),
              ),
              FilledButton.tonal(
                onPressed:
                    data.isShared &&
                        !_priceSaving &&
                        priceChanged &&
                        (_selectedPriceMode != _ManageCardPriceMode.myPrice ||
                            manualPrice != null)
                    ? _savePriceDisplay
                    : null,
                child: _priceSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Save price'),
              ),
            ],
          ),
          if (_statusMessage != null) ...[
            const SizedBox(height: 10),
            Text(
              _statusMessage!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCopiesSection(
    ThemeData theme,
    ColorScheme colorScheme,
    VaultManageCardData data,
  ) {
    return _ManageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Copies',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Choose the exact copy you want to inspect later.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
            ),
          ),
          const SizedBox(height: 12),
          if (data.copies.isEmpty)
            _SubtleEmptyState(
              title: 'No copies surfaced yet',
              body:
                  'Exact copies will appear here when the vault instance read returns rows.',
            )
          else
            Column(
              children: [
                for (var index = 0; index < data.copies.length; index++) ...[
                  _CopyRow(
                    copy: data.copies[index],
                    onTap: (data.copies[index].gvviId ?? '').trim().isEmpty
                        ? null
                        : () => _openExactCopy(data.copies[index]),
                  ),
                  if (index < data.copies.length - 1)
                    const SizedBox(height: 10),
                ],
              ],
            ),
        ],
      ),
    );
  }

  String _formatRarity(String raw) {
    return raw
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .map((part) {
          final lower = part.toLowerCase();
          return '${lower[0].toUpperCase()}${lower.substring(1)}';
        })
        .join(' ');
  }
}

class _ManageSurface extends StatelessWidget {
  const _ManageSurface({required this.child, this.emphasize = false});

  final Widget child;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: emphasize ? 0.2 : 0.14),
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(
              alpha: emphasize ? 0.08 : 0.04,
            ),
            blurRadius: emphasize ? 18 : 12,
            offset: Offset(0, emphasize ? 8 : 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: child,
    );
  }
}

class _CardThumb extends StatelessWidget {
  const _CardThumb({required this.imageUrl, required this.size});

  final String? imageUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final normalized = imageUrl?.trim() ?? '';

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: SizedBox(
        width: size,
        height: size * 1.32,
        child: normalized.isEmpty
            ? Container(
                color: colorScheme.surfaceContainerHighest,
                child: const Icon(Icons.style),
              )
            : Image.network(
                normalized,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  color: colorScheme.surfaceContainerHighest,
                  child: const Icon(Icons.broken_image),
                ),
              ),
      ),
    );
  }
}

class _PillLabel extends StatelessWidget {
  const _PillLabel({required this.label, required this.tone});

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: tone,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label, required this.tone});

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: tone,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _CountChip extends StatelessWidget {
  const _CountChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w700,
          color: colorScheme.onSurface.withValues(alpha: 0.72),
        ),
      ),
    );
  }
}

class _CopyRow extends StatelessWidget {
  const _CopyRow({required this.copy, this.onTap});

  final VaultManageCardCopy copy;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final metaParts = <String>[
      if ((copy.gvviId ?? '').isNotEmpty) copy.gvviId!,
      if (copy.createdAt != null) _formatDate(copy.createdAt!),
    ];
    final copyTitle = copy.isGraded
        ? [
            if ((copy.grader ?? '').isNotEmpty) copy.grader!,
            if ((copy.grade ?? '').isNotEmpty) copy.grade!,
          ].join(' ')
        : 'Raw ${copy.conditionLabel}';

    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                copyTitle.trim().isEmpty ? 'Vault copy' : copyTitle.trim(),
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            if (onTap != null)
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.38),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            _InlineTag(label: _intentLabel(copy.intent)),
            _InlineTag(label: copy.conditionLabel),
            if ((copy.certNumber ?? '').isNotEmpty)
              _InlineTag(label: copy.certNumber!),
          ],
        ),
        if (metaParts.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            metaParts.join(' • '),
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.66),
            ),
          ),
        ],
        if ((copy.note ?? '').isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            copy.note!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.74),
              height: 1.3,
            ),
          ),
        ],
      ],
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.32),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Padding(padding: const EdgeInsets.all(12), child: body),
        ),
      ),
    );
  }

  String _intentLabel(String intent) {
    switch (intent) {
      case 'trade':
        return 'Trade';
      case 'sell':
        return 'Sell';
      case 'showcase':
        return 'Showcase';
      default:
        return 'Hold';
    }
  }

  static String _formatDate(DateTime value) {
    return '${value.month}/${value.day}/${value.year}';
  }
}

class _InlineTag extends StatelessWidget {
  const _InlineTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.16)),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w700,
          color: colorScheme.onSurface.withValues(alpha: 0.74),
        ),
      ),
    );
  }
}

class _SubtleEmptyState extends StatelessWidget {
  const _SubtleEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            body,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }
}
