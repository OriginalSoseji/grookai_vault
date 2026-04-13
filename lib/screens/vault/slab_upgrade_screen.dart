import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/vault/slab_upgrade_service.dart';
import '../../widgets/card_surface_artwork.dart';

class SlabUpgradeScreen extends StatefulWidget {
  const SlabUpgradeScreen({
    super.key,
    required this.sourceInstanceId,
    required this.cardPrintId,
    required this.gvId,
    required this.cardName,
    required this.setName,
    this.imageUrl,
  });

  final String sourceInstanceId;
  final String cardPrintId;
  final String gvId;
  final String cardName;
  final String setName;
  final String? imageUrl;

  @override
  State<SlabUpgradeScreen> createState() => _SlabUpgradeScreenState();
}

class _SlabUpgradeScreenState extends State<SlabUpgradeScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final TextEditingController _certNumberController = TextEditingController();
  final TextEditingController _certConfirmController = TextEditingController();

  String _grader = 'PSA';
  String _selectedGrade = '10';
  bool _ownershipConfirmed = false;
  bool _verifying = false;
  bool _submitting = false;
  String? _error;
  SlabUpgradeVerificationResult? _verification;

  @override
  void dispose() {
    _certNumberController.dispose();
    _certConfirmController.dispose();
    super.dispose();
  }

  void _resetVerification() {
    setState(() {
      _verification = null;
      _error = null;
    });
  }

  String? _validateCertInputs() {
    final certNumber = _certNumberController.text.trim();
    final confirm = _certConfirmController.text.trim();

    if (certNumber.isEmpty || confirm.isEmpty) {
      return 'Enter the certification number twice before verifying.';
    }
    if (certNumber != confirm) {
      return 'Certification number confirmation must match exactly.';
    }
    return null;
  }

  String? _gradeMismatchMessage(SlabUpgradeVerificationResult? result) {
    final verifiedGrade = SlabUpgradeService.normalizePsaGradeValue(
      result?.grade,
    );
    if (verifiedGrade == null || verifiedGrade == _selectedGrade) {
      return null;
    }
    return 'PSA verified this cert as grade ${result!.grade}, so the selected grade must match.';
  }

  Future<void> _verify() async {
    final certError = _validateCertInputs();
    if (certError != null) {
      setState(() {
        _error = certError;
        _verification = null;
      });
      return;
    }

    setState(() {
      _verifying = true;
      _error = null;
      _verification = null;
    });

    try {
      final result = await SlabUpgradeService.verifyPsaCert(
        certNumber: _certNumberController.text.trim(),
      );
      if (!mounted) {
        return;
      }

      setState(() {
        _verifying = false;
        _verification = result;
        _ownershipConfirmed = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _verifying = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _submit() async {
    final certError = _validateCertInputs();
    if (certError != null) {
      setState(() {
        _error = certError;
      });
      return;
    }

    final verification = _verification;
    final gradeMismatch = _gradeMismatchMessage(verification);
    if (verification == null || verification.verified != true) {
      setState(() {
        _error = 'Verify the PSA certification number before saving.';
      });
      return;
    }
    if (gradeMismatch != null) {
      setState(() {
        _error = gradeMismatch;
      });
      return;
    }
    if (!_ownershipConfirmed) {
      setState(() {
        _error = 'Confirm ownership before saving this slab.';
      });
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final result = await SlabUpgradeService.submit(
        client: _client,
        sourceInstanceId: widget.sourceInstanceId,
        cardPrintId: widget.cardPrintId,
        gvId: widget.gvId,
        cardName: widget.cardName,
        setName: widget.setName,
        cardImageUrl: widget.imageUrl,
        grader: _grader,
        selectedGrade: _selectedGrade,
        certNumber: _certNumberController.text.trim(),
        certNumberConfirm: _certConfirmController.text.trim(),
        ownershipConfirmed: _ownershipConfirmed,
      );
      if (!mounted) {
        return;
      }

      Navigator.of(context).pop(result);
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _submitting = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final verification = _verification;
    final gradeMismatch = _gradeMismatchMessage(verification);
    final canSubmit =
        !_verifying &&
        !_submitting &&
        verification?.verified == true &&
        gradeMismatch == null &&
        _ownershipConfirmed;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        appBar: AppBar(title: const Text('Upgrade to Slab')),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              16,
              12,
              16,
              24 + MediaQuery.of(context).viewInsets.bottom,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _HeroCard(
                  cardName: widget.cardName,
                  setName: widget.setName,
                  imageUrl: widget.imageUrl,
                ),
                const SizedBox(height: 16),
                _SectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Enter slab details',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'PSA is the only supported grading company in V1. Verification stays server-backed.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.68),
                        ),
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        initialValue: _grader,
                        decoration: const InputDecoration(
                          labelText: 'Grading company',
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem<String>(
                            value: 'PSA',
                            child: Text('PSA'),
                          ),
                        ],
                        onChanged: _submitting || _verifying
                            ? null
                            : (value) {
                                if (value == null) {
                                  return;
                                }
                                setState(() {
                                  _grader = value;
                                  _verification = null;
                                  _error = null;
                                });
                              },
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _certNumberController,
                        enabled: !_submitting,
                        onChanged: (_) => _resetVerification(),
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.next,
                        inputFormatters: <TextInputFormatter>[
                          FilteringTextInputFormatter.allow(
                            RegExp(r'[0-9A-Za-z\- ]'),
                          ),
                        ],
                        decoration: const InputDecoration(
                          labelText: 'Cert number',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _certConfirmController,
                        enabled: !_submitting,
                        onChanged: (_) => _resetVerification(),
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        inputFormatters: <TextInputFormatter>[
                          FilteringTextInputFormatter.allow(
                            RegExp(r'[0-9A-Za-z\- ]'),
                          ),
                        ],
                        decoration: const InputDecoration(
                          labelText: 'Confirm cert number',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _selectedGrade,
                        decoration: const InputDecoration(
                          labelText: 'Grade',
                          border: OutlineInputBorder(),
                        ),
                        items: kPsaGradeOptions
                            .map(
                              (grade) => DropdownMenuItem<String>(
                                value: grade,
                                child: Text(grade),
                              ),
                            )
                            .toList(),
                        onChanged: _submitting
                            ? null
                            : (value) {
                                if (value == null) {
                                  return;
                                }
                                setState(() {
                                  _selectedGrade = value;
                                  _error = null;
                                });
                              },
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Grade label will be saved as PSA $_selectedGrade.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.62),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _SectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Verification',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (verification != null) ...[
                        _VerificationCard(
                          result: verification,
                          selectedGrade: _selectedGrade,
                        ),
                        if (gradeMismatch != null) ...[
                          const SizedBox(height: 10),
                          Text(
                            gradeMismatch,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.error,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        const SizedBox(height: 10),
                      ],
                      OutlinedButton.icon(
                        onPressed: _verifying || _submitting ? null : _verify,
                        icon: _verifying
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.verified_outlined),
                        label: Text(
                          _verifying ? 'Verifying...' : 'Verify with PSA',
                        ),
                      ),
                      const SizedBox(height: 10),
                      CheckboxListTile(
                        value: _ownershipConfirmed,
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        onChanged: _submitting
                            ? null
                            : (value) {
                                setState(() {
                                  _ownershipConfirmed = value == true;
                                  _error = null;
                                });
                              },
                        title: const Text('I confirm I own this slab.'),
                      ),
                    ],
                  ),
                ),
                if ((_error ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: canSubmit ? _submit : null,
                  icon: _submitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.verified_rounded),
                  label: Text(
                    _submitting ? 'Saving slab...' : 'Upgrade to Slab',
                  ),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.cardName,
    required this.setName,
    this.imageUrl,
  });

  final String cardName;
  final String setName;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return _SectionCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CardSurfaceArtwork(
            label: cardName,
            imageUrl: imageUrl,
            width: 96,
            height: 136,
            borderRadius: 14,
            showZoomAffordance: true,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  cardName,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  setName,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.68),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest.withValues(
                      alpha: 0.42,
                    ),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    'Raw exact copy',
                    style: theme.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _VerificationCard extends StatelessWidget {
  const _VerificationCard({required this.result, required this.selectedGrade});

  final SlabUpgradeVerificationResult result;
  final String selectedGrade;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final verifiedGrade = SlabUpgradeService.normalizePsaGradeValue(
      result.grade,
    );
    final mismatch = verifiedGrade != null && verifiedGrade != selectedGrade;
    final isVerified = result.verified && !mismatch;
    final toneColor = isVerified ? Colors.green : colorScheme.error;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: toneColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: toneColor.withValues(alpha: 0.18)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if ((result.imageUrl ?? '').isNotEmpty) ...[
            CardSurfaceArtwork(
              label: result.title ?? result.certNumber,
              imageUrl: result.imageUrl,
              width: 72,
              height: 102,
              borderRadius: 12,
              enableTapToZoom: false,
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isVerified ? 'PSA verified' : 'Verification result',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: toneColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  result.title ?? 'Cert ${result.certNumber}',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if ((result.grade ?? '').isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    'PSA ${result.grade}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.74),
                    ),
                  ),
                ],
                if ((result.errorCode ?? '').isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    result.errorCode!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.error,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Padding(padding: const EdgeInsets.all(16), child: child),
    );
  }
}
