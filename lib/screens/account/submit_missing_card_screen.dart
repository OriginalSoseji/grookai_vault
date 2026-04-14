import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/warehouse/warehouse_submission_service.dart';

class SubmitMissingCardScreen extends StatefulWidget {
  const SubmitMissingCardScreen({super.key});

  @override
  State<SubmitMissingCardScreen> createState() =>
      _SubmitMissingCardScreenState();
}

class _SubmitMissingCardScreenState extends State<SubmitMissingCardScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final ImagePicker _picker = ImagePicker();
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _tcgplayerIdController = TextEditingController();

  WarehouseSubmissionIntentType? _intent;
  XFile? _frontImage;
  XFile? _backImage;
  bool _submitting = false;
  String? _statusMessage;
  _SubmitStatusTone _statusTone = _SubmitStatusTone.pending;
  String? _candidateId;

  @override
  void dispose() {
    _notesController.dispose();
    _tcgplayerIdController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(WarehouseEvidenceImageType type) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Photo Library'),
              onTap: () => Navigator.of(context).pop(ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Camera'),
              onTap: () => Navigator.of(context).pop(ImageSource.camera),
            ),
          ],
        ),
      ),
    );

    if (source == null) {
      return;
    }

    final picked = await _picker.pickImage(
      source: source,
      imageQuality: 92,
      maxWidth: 2200,
      preferredCameraDevice: CameraDevice.rear,
    );

    if (!mounted || picked == null) {
      return;
    }

    setState(() {
      if (type == WarehouseEvidenceImageType.front) {
        _frontImage = picked;
      } else {
        _backImage = picked;
      }
      _statusMessage = null;
      _candidateId = null;
    });
  }

  Future<void> _submit() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      setState(() {
        _statusTone = _SubmitStatusTone.error;
        _statusMessage = 'Sign in required.';
      });
      return;
    }

    final intent = _intent;
    if (intent == null || _frontImage == null) {
      final validation = WarehouseSubmissionService.validate(
        intent: intent,
        notes: _notesController.text,
        tcgplayerId: _tcgplayerIdController.text,
        frontImage: _frontImage,
        backImage: _backImage,
      );
      setState(() {
        _statusTone = _SubmitStatusTone.error;
        _statusMessage =
            validation.submissionIntent ??
            validation.frontImage ??
            validation.notes ??
            validation.tcgplayerId ??
            'Fix the highlighted fields before submitting.';
      });
      return;
    }

    setState(() {
      _submitting = true;
      _statusTone = _SubmitStatusTone.pending;
      _statusMessage = 'Uploading evidence...';
      _candidateId = null;
    });

    try {
      final result = await WarehouseSubmissionService.submit(
        client: _client,
        userId: userId,
        intent: intent,
        notes: _notesController.text,
        tcgplayerId: _tcgplayerIdController.text,
        frontImage: _frontImage!,
        backImage: _backImage,
        onStage: (message) {
          if (!mounted) {
            return;
          }
          setState(() {
            _statusTone = _SubmitStatusTone.pending;
            _statusMessage = message;
          });
        },
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _submitting = false;
        _statusTone = _SubmitStatusTone.success;
        _statusMessage = 'Submission received. It is now in warehouse review.';
        _candidateId = result.candidateId;
        _intent = null;
        _frontImage = null;
        _backImage = null;
        _notesController.clear();
        _tcgplayerIdController.clear();
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _submitting = false;
        _statusTone = _SubmitStatusTone.error;
        _statusMessage = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final validation = WarehouseSubmissionService.validate(
      intent: _intent,
      notes: _notesController.text,
      tcgplayerId: _tcgplayerIdController.text,
      frontImage: _frontImage,
      backImage: _backImage,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Submit Missing Card')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
          children: [
            _SubmissionSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Submit a missing card or image',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Upload evidence, explain what is missing, and send the report into warehouse review.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.72),
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _SubmissionSurface(
              child: Column(
                children: [
                  _IntentCard(
                    title: 'Missing Card',
                    body:
                        'Use this when the card itself does not exist in Grookai yet.',
                    selected:
                        _intent == WarehouseSubmissionIntentType.missingCard,
                    onTap: () => setState(() {
                      _intent = WarehouseSubmissionIntentType.missingCard;
                      _statusMessage = null;
                      _candidateId = null;
                    }),
                  ),
                  const SizedBox(height: 10),
                  _IntentCard(
                    title: 'Missing Image',
                    body:
                        'Use this when the card exists, but its image is missing or incorrect.',
                    selected:
                        _intent == WarehouseSubmissionIntentType.missingImage,
                    onTap: () => setState(() {
                      _intent = WarehouseSubmissionIntentType.missingImage;
                      _statusMessage = null;
                      _candidateId = null;
                    }),
                  ),
                  if (validation.submissionIntent != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      validation.submissionIntent!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.red.shade700,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            _SubmissionSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: _notesController,
                    enabled: !_submitting,
                    maxLines: 6,
                    decoration: const InputDecoration(
                      labelText: 'Notes',
                      hintText:
                          'Tell Grookai what is missing and what a reviewer should look at.',
                    ),
                    onChanged: (_) => setState(() {
                      _statusMessage = null;
                      _candidateId = null;
                    }),
                  ),
                  if (validation.notes != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      validation.notes!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.red.shade700,
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  TextField(
                    controller: _tcgplayerIdController,
                    enabled: !_submitting,
                    decoration: InputDecoration(
                      labelText: 'TCGPlayer ID',
                      hintText:
                          _intent == WarehouseSubmissionIntentType.missingImage
                          ? 'Required for missing image submissions'
                          : 'Optional reference id',
                    ),
                    onChanged: (_) => setState(() {
                      _statusMessage = null;
                      _candidateId = null;
                    }),
                  ),
                  if (validation.tcgplayerId != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      validation.tcgplayerId!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.red.shade700,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            _SubmissionSurface(
              child: Column(
                children: [
                  _EvidenceCard(
                    label: 'Front image',
                    description:
                        'Required. Start with the front for consistent warehouse review.',
                    image: _frontImage,
                    errorText: validation.frontImage,
                    onPick: () => _pickImage(WarehouseEvidenceImageType.front),
                    onRemove: _submitting
                        ? null
                        : () => setState(() {
                            _frontImage = null;
                            _statusMessage = null;
                            _candidateId = null;
                          }),
                  ),
                  const SizedBox(height: 12),
                  _EvidenceCard(
                    label: 'Back image',
                    description:
                        'Optional. Add the back if it helps explain the report.',
                    image: _backImage,
                    errorText: validation.backImage,
                    onPick: () => _pickImage(WarehouseEvidenceImageType.back),
                    onRemove: _submitting
                        ? null
                        : () => setState(() {
                            _backImage = null;
                            _statusMessage = null;
                            _candidateId = null;
                          }),
                  ),
                ],
              ),
            ),
            if (_statusMessage != null) ...[
              const SizedBox(height: 12),
              _SubmitStatusBanner(
                tone: _statusTone,
                message: _statusMessage!,
                candidateId: _candidateId,
              ),
            ],
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? 'Submitting…' : 'Submit to warehouse'),
            ),
            const SizedBox(height: 8),
            Text(
              'Front image required. Max ${WarehouseSubmissionService.maxImageBytes ~/ (1024 * 1024)} MB per image.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.62),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _SubmitStatusTone { success, error, pending }

class _SubmissionSurface extends StatelessWidget {
  const _SubmissionSurface({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      child: child,
    );
  }
}

class _IntentCard extends StatelessWidget {
  const _IntentCard({
    required this.title,
    required this.body,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String body;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: selected
          ? colorScheme.primary.withValues(alpha: 0.08)
          : colorScheme.surfaceContainerHighest.withValues(alpha: 0.25),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                body,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.72),
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EvidenceCard extends StatelessWidget {
  const _EvidenceCard({
    required this.label,
    required this.description,
    required this.image,
    required this.onPick,
    this.onRemove,
    this.errorText,
  });

  final String label;
  final String description;
  final XFile? image;
  final String? errorText;
  final VoidCallback onPick;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.7),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Container(
              color: colorScheme.surface,
              height: 220,
              width: double.infinity,
              child: image == null
                  ? Center(
                      child: Text(
                        label == 'Front image'
                            ? 'Add the card front to submit this report.'
                            : 'Optional back image for extra review context.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    )
                  : Image.network(
                      image!.path,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) =>
                          Image.file(File(image!.path), fit: BoxFit.contain),
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: onPick,
                icon: const Icon(Icons.add_a_photo_outlined),
                label: Text(image == null ? 'Choose image' : 'Replace image'),
              ),
              if (image != null && onRemove != null)
                OutlinedButton(
                  onPressed: onRemove,
                  child: const Text('Remove'),
                ),
            ],
          ),
          if (image != null) ...[
            const SizedBox(height: 8),
            Text(
              image!.name,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.62),
              ),
            ),
          ],
          if (errorText != null) ...[
            const SizedBox(height: 8),
            Text(
              errorText!,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: Colors.red.shade700),
            ),
          ],
        ],
      ),
    );
  }
}

class _SubmitStatusBanner extends StatelessWidget {
  const _SubmitStatusBanner({
    required this.tone,
    required this.message,
    this.candidateId,
  });

  final _SubmitStatusTone tone;
  final String message;
  final String? candidateId;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final (background, foreground, border) = switch (tone) {
      _SubmitStatusTone.success => (
        colorScheme.primary.withValues(alpha: 0.08),
        colorScheme.primary,
        colorScheme.primary.withValues(alpha: 0.18),
      ),
      _SubmitStatusTone.pending => (
        Colors.lightBlue.withValues(alpha: 0.1),
        Colors.lightBlue.shade800,
        Colors.lightBlue.withValues(alpha: 0.18),
      ),
      _SubmitStatusTone.error => (
        Colors.red.withValues(alpha: 0.08),
        Colors.red.shade700,
        Colors.red.withValues(alpha: 0.18),
      ),
    };

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (candidateId != null) ...[
            const SizedBox(height: 6),
            Text(
              'Candidate ID: $candidateId',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: foreground,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
