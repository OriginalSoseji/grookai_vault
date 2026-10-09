import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/notifications/grookai_push_notification_service.dart';
import '../../services/notifications/notification_device_registration.dart';
import '../../services/notifications/notification_preferences.dart';
import '../../services/notifications/notification_preferences_controller.dart';
import '../../services/notifications/notification_timezones.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({
    super.key,
    this.repository,
    this.ownerChanges,
    this.readPermission,
    this.enableDevice,
  });
  final NotificationPreferencesRepository? repository;
  final Stream<String?>? ownerChanges;
  final Future<NotificationPermission?> Function()? readPermission;
  final Future<NotificationDeviceOutcome> Function()? enableDevice;
  @override
  State<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState
    extends State<NotificationSettingsScreen> {
  NotificationPreferencesController? _controller;
  StreamSubscription<String?>? _authSubscription;
  final _start = TextEditingController(text: '22:00');
  final _end = TextEditingController(text: '08:00');
  final _zone = TextEditingController(text: 'UTC');
  bool _quietEnabled = false, _quietDirty = false, _deviceBusy = false;
  bool _applyingDraft = false;
  String? _formError, _deviceMessage;
  NotificationPermission? _permission;
  int _deviceRevision = 0;

  @override
  void initState() {
    super.initState();
    _zone.addListener(_zoneChanged);
    final client = widget.repository == null ? Supabase.instance.client : null;
    final owner =
        widget.repository?.currentOwnerId ?? client?.auth.currentUser?.id;
    if (owner == null) return;
    final repository =
        widget.repository ??
        SupabaseNotificationPreferencesRepository(
          client: client!,
          ownerId: owner,
          timezones: notificationTimezones.toSet(),
        );
    _controller = NotificationPreferencesController(
      ownerId: owner,
      repository: repository,
    )..addListener(_changed);
    _authSubscription =
        (widget.ownerChanges ??
                client?.auth.onAuthStateChange.map(
                  (event) => event.session?.user.id,
                ))
            ?.listen((next) {
              if (next != owner) _controller?.close();
            });
    unawaited(_controller!.load());
    unawaited(_readPermission());
  }

  String _time(String? value, String fallback) => value == null
      ? fallback
      : value.startsWith('24:00')
      ? '00:00'
      : value.substring(0, value.length < 5 ? value.length : 5);

  void _applyDraft(NotificationPreferences value) {
    _applyingDraft = true;
    _quietEnabled =
        value.quietStart != null &&
        value.quietEnd != null &&
        _time(value.quietStart, '') != _time(value.quietEnd, '');
    _start.text = _time(value.quietStart, '22:00');
    _end.text = _time(value.quietEnd, '08:00');
    _zone.text = value.timezone ?? 'UTC';
    _quietDirty = false;
    _applyingDraft = false;
  }

  void _zoneChanged() {
    if (mounted &&
        !_applyingDraft &&
        _controller?.closed == false &&
        _controller?.busy == false) {
      setState(() => _quietDirty = true);
    }
  }

  String? _quietIssue(NotificationPreferences value) {
    if (value.quietStart == null && value.quietEnd == null) return null;
    if (value.quietStart == null || value.quietEnd == null) {
      return 'Saved quiet hours are incomplete, so they do not pause updates. Choose a start and end time to enable them.';
    }
    if (_time(value.quietStart, '') == _time(value.quietEnd, '')) {
      return 'Saved quiet hours have the same start and end, so they are off. Choose different times to enable them.';
    }
    if (value.timezone != null &&
        !notificationTimezones.contains(value.timezone)) {
      return 'Your saved timezone needs review. Choose a timezone from the list before saving quiet hours. An unavailable saved timezone uses UTC.';
    }
    return null;
  }

  bool _validOwner() {
    final controller = _controller;
    if (controller == null || controller.closed) return false;
    if (controller.repository.currentOwnerId != controller.ownerId) {
      controller.close();
      return false;
    }
    return true;
  }

  void _changed() {
    if (!mounted) return;
    final controller = _controller!;
    if (controller.closed) {
      _deviceRevision++;
      _permission = null;
      _deviceMessage = null;
      _deviceBusy = false;
      _start.clear();
      _end.clear();
      _zone.clear();
    } else if (!_quietDirty && controller.value != null) {
      _applyDraft(controller.value!);
    }
    setState(() {});
  }

  Future<void> _readPermission() async {
    final revision = ++_deviceRevision;
    if (!_validOwner()) return;
    setState(() => _deviceBusy = true);
    try {
      final permission =
          await (widget.readPermission?.call() ??
              GrookaiPushNotificationService.instance.readDevicePermission());
      if (!mounted || revision != _deviceRevision || !_validOwner()) return;
      setState(() => _permission = permission);
    } catch (_) {
      if (mounted &&
          revision == _deviceRevision &&
          _controller?.closed == false) {
        setState(() => _permission = null);
      }
    } finally {
      if (mounted &&
          revision == _deviceRevision &&
          _controller?.closed == false) {
        setState(() => _deviceBusy = false);
      }
    }
  }

  Future<void> _enableDevice() async {
    final controller = _controller;
    if (controller == null ||
        !_validOwner() ||
        controller.busy ||
        controller.needsReload ||
        controller.value == null ||
        _deviceBusy) {
      return;
    }
    final revision = ++_deviceRevision;
    setState(() {
      _deviceBusy = true;
      _deviceMessage = null;
    });
    try {
      final result =
          await (widget.enableDevice?.call() ??
              GrookaiPushNotificationService.instance.enableForCurrentUser());
      if (!mounted || revision != _deviceRevision || !_validOwner()) return;
      setState(
        () => _deviceMessage = switch (result) {
          NotificationDeviceOutcome.registered =>
            'Push notifications are enabled on this device.',
          NotificationDeviceOutcome.permissionDenied =>
            "Notifications are off in your phone's settings. Enable them there, then check again.",
          NotificationDeviceOutcome.permissionNeeded =>
            'Choose whether to allow notifications on this device.',
          NotificationDeviceOutcome.stale ||
          NotificationDeviceOutcome.signedOut =>
            'Your account changed. Reopen notification settings.',
          NotificationDeviceOutcome.failed =>
            'Notification setup could not finish. Try again.',
        },
      );
    } catch (_) {
      if (mounted && revision == _deviceRevision && !controller.closed) {
        setState(
          () => _deviceMessage =
              'Notification setup could not finish. Try again.',
        );
      }
    } finally {
      if (mounted && revision == _deviceRevision && !controller.closed) {
        setState(() => _deviceBusy = false);
        await _readPermission();
      }
    }
  }

  Future<void> _chooseTime(TextEditingController field) async {
    final parts = field.text.split(':');
    final hour = int.tryParse(parts.first) ?? 22;
    final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
    final selected = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(
        hour: hour.clamp(0, 23),
        minute: minute.clamp(0, 59),
      ),
    );
    if (!mounted || selected == null || _controller?.closed != false) return;
    setState(() {
      field.text =
          '${selected.hour.toString().padLeft(2, '0')}:${selected.minute.toString().padLeft(2, '0')}';
      _quietDirty = true;
    });
  }

  Future<void> _saveQuiet() async {
    final controller = _controller!;
    final pattern = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');
    if (_quietEnabled &&
        (!pattern.hasMatch(_start.text) ||
            !pattern.hasMatch(_end.text) ||
            _start.text == _end.text ||
            !notificationTimezones.contains(_zone.text.trim()))) {
      setState(
        () => _formError =
            'Choose different start and end times and a supported timezone.',
      );
      return;
    }
    setState(() => _formError = null);
    final saved = _quietEnabled
        ? await controller.saveQuietHours(
            start: _start.text,
            end: _end.text,
            timezone: _zone.text.trim(),
          )
        : await controller.disableQuietHours();
    if (saved && mounted && !controller.closed && controller.value != null) {
      setState(() => _applyDraft(controller.value!));
    }
  }

  @override
  void dispose() {
    _deviceRevision++;
    _authSubscription?.cancel();
    _controller?.removeListener(_changed);
    _controller?.dispose();
    _zone.removeListener(_zoneChanged);
    _start.dispose();
    _end.dispose();
    _zone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final value = controller?.value;
    final disabled =
        controller == null ||
        controller.busy ||
        controller.needsReload ||
        controller.closed;
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (controller == null)
              const Text('Sign in to manage notifications.')
            else if (controller.closed)
              Text(controller.error!)
            else ...[
              const Text(
                'Choose which collection and message updates Grookai can send to your devices.',
              ),
              if (controller.error != null) ...[
                const SizedBox(height: 12),
                Text(controller.error!, semanticsLabel: controller.error),
                if (value == null || controller.needsReload)
                  OutlinedButton(
                    onPressed: controller.busy ? null : controller.load,
                    child: const Text('Reload settings'),
                  ),
              ],
              if (controller.loading)
                const Padding(
                  padding: EdgeInsets.all(20),
                  child: Center(child: CircularProgressIndicator()),
                ),
              if (value != null) ...[
                const SizedBox(height: 16),
                for (final entry in const [
                  (
                    NotificationCadence.instant,
                    'Instant updates',
                    'Collection activity, matches and messages as they become available.',
                  ),
                  (
                    NotificationCadence.daily,
                    'Daily updates',
                    'Daily Pulse and match summaries when there is something to share.',
                  ),
                  (
                    NotificationCadence.weekly,
                    'Weekly updates',
                    'Not available yet. This saves your preference for when they are.',
                  ),
                ])
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(entry.$2),
                    subtitle: Text(entry.$3),
                    value: value.cadence(entry.$1),
                    onChanged: disabled
                        ? null
                        : (enabled) =>
                              controller.saveCadence(entry.$1, enabled),
                  ),
                const Divider(height: 32),
                Text(
                  'Quiet hours',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if (_quietIssue(value) != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(_quietIssue(value)!),
                  ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    'Pause collection and message updates during quiet hours',
                  ),
                  value: _quietEnabled,
                  onChanged: disabled
                      ? null
                      : (enabled) => setState(() {
                          _quietEnabled = enabled;
                          _quietDirty = true;
                        }),
                ),
                if (_quietEnabled) ...[
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _start,
                          readOnly: true,
                          enabled: !disabled,
                          onTap: () => _chooseTime(_start),
                          decoration: const InputDecoration(
                            labelText: 'Start',
                            suffixIcon: Icon(Icons.schedule),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: TextField(
                          controller: _end,
                          readOnly: true,
                          enabled: !disabled,
                          onTap: () => _chooseTime(_end),
                          decoration: const InputDecoration(
                            labelText: 'End',
                            suffixIcon: Icon(Icons.schedule),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  LayoutBuilder(
                    builder: (context, constraints) => DropdownMenu<String>(
                      controller: _zone,
                      width: constraints.maxWidth,
                      enabled: !disabled,
                      enableFilter: true,
                      enableSearch: true,
                      requestFocusOnTap: true,
                      menuHeight: 280,
                      label: const Text('Timezone'),
                      onSelected: (_) => setState(() => _quietDirty = true),
                      dropdownMenuEntries: notificationTimezones
                          .map(
                            (zone) =>
                                DropdownMenuEntry(value: zone, label: zone),
                          )
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Times follow this timezone, including daylight-saving changes. A later start continues overnight.',
                  ),
                ],
                if (_formError != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(_formError!),
                  ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: disabled || !_quietDirty ? null : _saveQuiet,
                  child: Text(
                    controller.saving ? 'Saving…' : 'Save quiet hours',
                  ),
                ),
                const Divider(height: 32),
                Text(
                  'This device',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(switch (_permission) {
                  NotificationPermission.granted =>
                    'Device permission: Allowed',
                  NotificationPermission.denied =>
                    "Notifications are off in your phone's settings.",
                  NotificationPermission.undetermined =>
                    'Choose whether to allow push notifications on this device.',
                  null =>
                    'Device notification permission is unavailable right now.',
                }),
                if (_deviceMessage != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(_deviceMessage!),
                  ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: disabled || _deviceBusy
                      ? null
                      : (_permission == null ||
                                _permission == NotificationPermission.denied
                            ? _readPermission
                            : _enableDevice),
                  child: Text(
                    _deviceBusy
                        ? 'Checking…'
                        : _permission == null ||
                              _permission == NotificationPermission.denied
                        ? 'Check device permission'
                        : 'Enable on this device',
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
