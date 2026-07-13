import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/grookai_memory_card.dart';
import '../../services/grookai_objects/grookai_object_export_service.dart';
import '../../services/vault/collector_memory_service.dart';
import '../../widgets/grookai_objects/grookai_object_flattened_renderer.dart';
import '../../widgets/grookai_objects/grookai_object.dart';
import '../../widgets/grookai_objects/grookai_object_skin.dart';
import '../../widgets/grookai_objects/grookai_object_skin_picker.dart';

class MemoryCardCaptureScreen extends StatefulWidget {
  MemoryCardCaptureScreen({
    super.key,
    required this.gvviId,
    required this.cardPrintId,
    required this.source,
    CollectorMemoryService? memoryService,
    GrookaiObjectExportService? exportService,
    ImagePicker? imagePicker,
    this.currentUserId,
  }) : memoryService = memoryService ?? CollectorMemoryService(),
       exportService = exportService ?? const GrookaiObjectExportService(),
       imagePicker = imagePicker ?? ImagePicker();

  final String gvviId;
  final String cardPrintId;
  final GrookaiMemoryCardSource source;
  final CollectorMemoryService memoryService;
  final GrookaiObjectExportService exportService;
  final ImagePicker imagePicker;
  final String? currentUserId;

  @override
  State<MemoryCardCaptureScreen> createState() =>
      _MemoryCardCaptureScreenState();
}

class _MemoryCardCaptureScreenState extends State<MemoryCardCaptureScreen> {
  final TextEditingController _noteController = TextEditingController();
  final TextEditingController _placeController = TextEditingController();
  final TextEditingController _occasionController = TextEditingController();
  final TextEditingController _dateController = TextEditingController();
  final GlobalKey _exportBoundaryKey = GlobalKey();

  GrookaiObjectSkin _skin = GrookaiObjectSkin.onyx;
  CollectorMemoryType _memoryType = CollectorMemoryType.note;
  bool _showFront = true;
  bool _saving = false;
  bool _sharing = false;
  XFile? _photo;
  String? _error;
  GrookaiObject? _savedObject;

  @override
  void dispose() {
    _noteController.dispose();
    _placeController.dispose();
    _occasionController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final picked = await widget.imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 88,
      maxWidth: 1600,
    );
    if (picked == null || !mounted) {
      return;
    }
    setState(() {
      _photo = picked;
      _error = null;
    });
  }

  Future<void> _saveMemoryCard() async {
    if (_saving) {
      return;
    }

    final parsedDate = _parseDate(_dateController.text);
    if (_dateController.text.trim().isNotEmpty && parsedDate == null) {
      setState(() {
        _error = 'Use YYYY-MM-DD for the memory date.';
      });
      return;
    }

    final note = _blankToNull(_noteController.text);
    final place = _blankToNull(_placeController.text);
    final occasion = _blankToNull(_occasionController.text);
    if (note == null && place == null && occasion == null && _photo == null) {
      setState(() {
        _error = 'Add a note, place, occasion, or photo.';
      });
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      var saved = await widget.memoryService.create(
        gvviId: widget.gvviId,
        memoryType: _memoryType,
        note: note,
        placeLabel: place,
        occasionLabel: occasion,
        memoryDate: parsedDate,
      );

      var photoPath = saved.photoPath;
      final pickedPhoto = _photo;
      if (pickedPhoto != null) {
        final userId = _currentUserId();
        if (userId == null) {
          throw StateError('Sign in to attach a memory photo.');
        }
        photoPath = await widget.memoryService.uploadPhoto(
          userId: userId,
          memoryId: saved.id,
          file: pickedPhoto,
        );
        saved = await widget.memoryService.update(
          memoryId: saved.id,
          note: note,
          photoPath: photoPath,
          placeLabel: place,
          occasionLabel: occasion,
          memoryDate: parsedDate,
        );
      }

      final signedPhotoUrl = await widget.memoryService.createSignedPhotoUrl(
        photoPath,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _savedObject = GrookaiMemoryCardAdapter.fromMemory(
          memory: saved,
          source: widget.source,
          skin: _skin,
          signedPhotoUrl: signedPhotoUrl,
        );
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Memory card saved.')));
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  Future<void> _shareCurrentCard() async {
    if (_sharing || _savedObject == null) {
      return;
    }

    setState(() {
      _sharing = true;
      _error = null;
    });

    try {
      final object = _previewObject;
      final bytes = await widget.exportService.capturePng(_exportBoundaryKey);
      await widget.exportService.sharePng(
        bytes: bytes,
        fileName: GrookaiObjectExportService.fileNameFor(
          type: 'memory',
          title: _exportTitle(object),
        ),
        subject: 'Grookai memory card',
        text: 'Shared from Grookai Vault',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = 'Unable to share this card right now.';
      });
    } finally {
      if (mounted) {
        setState(() => _sharing = false);
      }
    }
  }

  String? _currentUserId() {
    final injected = _blankToNull(widget.currentUserId);
    if (injected != null) {
      return injected;
    }
    try {
      return _blankToNull(Supabase.instance.client.auth.currentUser?.id);
    } catch (_) {
      return null;
    }
  }

  GrookaiObject get _previewObject {
    final saved = _savedObject;
    if (saved != null) {
      return saved.copyWith(skin: _skin);
    }
    return GrookaiMemoryCardAdapter.fromDraft(
      source: widget.source,
      skin: _skin,
      memoryType: _memoryType,
      memoryDate: _parseDate(_dateController.text),
      note: _noteController.text,
      placeLabel: _placeController.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Share Memory')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
          children: [
            Center(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: GrookaiObjectFlattenedRenderer(
                  repaintBoundaryKey: _exportBoundaryKey,
                  object: _previewObject,
                  showFront: _showFront,
                ),
              ),
            ),
            const SizedBox(height: 14),
            SegmentedButton<bool>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment<bool>(
                  value: true,
                  icon: Icon(Icons.flip_to_front_rounded),
                  label: Text('Front'),
                ),
                ButtonSegment<bool>(
                  value: false,
                  icon: Icon(Icons.flip_to_back_rounded),
                  label: Text('Back'),
                ),
              ],
              selected: {_showFront},
              onSelectionChanged: (selection) =>
                  setState(() => _showFront = selection.single),
            ),
            const SizedBox(height: 18),
            Text(
              'Skin',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            GrookaiObjectSkinPicker(
              selected: _skin,
              onChanged: (skin) => setState(() => _skin = skin),
            ),
            const SizedBox(height: 18),
            SegmentedButton<CollectorMemoryType>(
              showSelectedIcon: false,
              segments: [
                for (final type in CollectorMemoryType.values)
                  ButtonSegment<CollectorMemoryType>(
                    value: type,
                    label: Text(_memoryTypeLabel(type)),
                  ),
              ],
              selected: {_memoryType},
              onSelectionChanged: (selection) =>
                  setState(() => _memoryType = selection.single),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _noteController,
              minLines: 3,
              maxLines: 5,
              textInputAction: TextInputAction.newline,
              decoration: const InputDecoration(
                labelText: 'Memory note',
                hintText: 'Where it came from, who was there, why it matters',
              ),
              onChanged: (_) => setState(() => _savedObject = null),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _placeController,
              decoration: const InputDecoration(labelText: 'Place'),
              onChanged: (_) => setState(() => _savedObject = null),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _occasionController,
              decoration: const InputDecoration(labelText: 'Occasion'),
              onChanged: (_) => setState(() => _savedObject = null),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _dateController,
              keyboardType: TextInputType.datetime,
              decoration: const InputDecoration(
                labelText: 'Date',
                hintText: 'YYYY-MM-DD',
              ),
              onChanged: (_) => setState(() => _savedObject = null),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _pickPhoto,
              icon: const Icon(Icons.add_photo_alternate_outlined),
              label: Text(_photo == null ? 'Attach one photo' : 'Photo ready'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(
                _error!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.error,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: _saving ? null : _saveMemoryCard,
              icon: _saving
                  ? const SizedBox.square(
                      dimension: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.auto_awesome_motion_outlined),
              label: Text(_saving ? 'Saving...' : 'Save memory card'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _savedObject == null || _sharing
                  ? null
                  : _shareCurrentCard,
              icon: _sharing
                  ? const SizedBox.square(
                      dimension: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.ios_share_outlined),
              label: Text(_sharing ? 'Sharing...' : 'Share image'),
            ),
          ],
        ),
      ),
    );
  }
}

DateTime? _parseDate(String value) {
  final normalized = value.trim();
  if (normalized.isEmpty) {
    return null;
  }
  final parsed = DateTime.tryParse(normalized);
  if (parsed == null) {
    return null;
  }
  return DateTime(parsed.year, parsed.month, parsed.day);
}

String? _blankToNull(String? value) {
  final normalized = (value ?? '').trim();
  return normalized.isEmpty ? null : normalized;
}

String _memoryTypeLabel(CollectorMemoryType type) {
  return switch (type) {
    CollectorMemoryType.addedPlace => 'Place',
    CollectorMemoryType.occasion => 'Occasion',
    CollectorMemoryType.first => 'First',
    CollectorMemoryType.note => 'Note',
  };
}

String _exportTitle(GrookaiObject object) {
  final fields = object.fields;
  final cardName = fields['cardName'] ?? fields['card_name'];
  if (cardName is String && cardName.trim().isNotEmpty) {
    return cardName;
  }
  final title = fields['title'];
  if (title is String && title.trim().isNotEmpty) {
    return title;
  }
  return object.type;
}
