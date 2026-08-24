import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';

import '../../firebase_options.dart';
import 'app_build_identity.dart';

class GrookaiCrashReportingService {
  GrookaiCrashReportingService._();

  static const bool _forceCollection = bool.fromEnvironment(
    'GROOKAI_CRASH_REPORTING_ENABLED',
  );
  static const bool _selfTest = bool.fromEnvironment(
    'GROOKAI_CRASH_REPORTING_SELF_TEST',
  );
  static const bool _fatalSelfTest = bool.fromEnvironment(
    'GROOKAI_CRASH_REPORTING_FATAL_SELF_TEST',
  );

  static bool _ready = false;

  static Future<void> initialize() async {
    if (kIsWeb) {
      return;
    }

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      }

      final crashlytics = FirebaseCrashlytics.instance;
      await crashlytics.setCrashlyticsCollectionEnabled(
        kReleaseMode || _forceCollection,
      );
      await Future.wait<void>([
        crashlytics.setCustomKey(
          'grookai_source_commit_sha',
          AppBuildIdentity.sourceCommitSha,
        ),
        crashlytics.setCustomKey(
          'grookai_build_run_id',
          AppBuildIdentity.buildRunId,
        ),
        crashlytics.setCustomKey(
          'grookai_governed_source_commit',
          AppBuildIdentity.hasGovernedSourceCommit,
        ),
      ]);

      FlutterError.onError = (details) {
        FlutterError.presentError(details);
        unawaited(crashlytics.recordFlutterFatalError(details));
      };

      _ready = true;
      if (_selfTest && !kReleaseMode) {
        unawaited(_runSelfTest(crashlytics));
      }
    } catch (error) {
      _debug('initialize_failed error=$error');
    }
  }

  static bool recordFatalError(Object error, StackTrace stackTrace) {
    if (!_ready || kIsWeb) {
      return false;
    }

    unawaited(
      FirebaseCrashlytics.instance.recordError(error, stackTrace, fatal: true),
    );
    return true;
  }

  static bool recordNonFatalError(
    Object error,
    StackTrace stackTrace, {
    required String reason,
    Map<String, Object?> context = const <String, Object?>{},
  }) {
    final normalizedReason = _diagnosticValue(reason);
    final information = <Object>[
      for (final entry in context.entries)
        if (_allowedContextKeys.contains(entry.key) && entry.value != null)
          '${entry.key}=${_diagnosticValue(entry.value)}',
    ];
    _debug(
      'non_fatal reason=$normalizedReason error_type=${error.runtimeType}',
    );

    if (!_ready || kIsWeb) {
      return false;
    }

    unawaited(
      FirebaseCrashlytics.instance.recordError(
        error,
        stackTrace,
        reason: normalizedReason,
        information: information,
        fatal: false,
      ),
    );
    return true;
  }

  static Future<void> _runSelfTest(FirebaseCrashlytics crashlytics) async {
    await Future<void>.delayed(const Duration(seconds: 2));
    if (_fatalSelfTest) {
      crashlytics.crash();
      return;
    }

    await crashlytics.recordError(
      StateError('Grookai Crashlytics self-test non-fatal event'),
      StackTrace.current,
      reason: 'GROOKAI_CRASH_REPORTING_SELF_TEST',
      fatal: false,
    );
  }

  static void _debug(String message) {
    if (kDebugMode) {
      debugPrint('[CRASH_REPORTING] $message');
    }
  }

  static const Set<String> _allowedContextKeys = <String>{
    'destination',
    'object_type',
    'operation',
    'platform',
    'send_status',
    'stage',
    'surface',
  };

  static String _diagnosticValue(Object? value) {
    final normalized = (value ?? 'unknown')
        .toString()
        .replaceAll(RegExp(r'[\r\n\t]+'), ' ')
        .trim();
    if (normalized.length <= 120) {
      return normalized;
    }
    return normalized.substring(0, 120);
  }
}
