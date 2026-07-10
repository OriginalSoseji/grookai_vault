import 'package:supabase_flutter/supabase_flutter.dart';

import 'founder_insight_service.dart';

const String _kFounderMetricsFunction = 'founder-metrics-mobile-v1';

class FounderMetricsBundle {
  const FounderMetricsBundle({
    required this.generatedAt,
    required this.latestWeek,
    required this.previousWeek,
    required this.interactionBreakdown,
    required this.watchesBySubject,
    required this.notificationByEventType,
    required this.notificationByTier,
    required this.onboardingLadder,
    required this.recommendations,
    required this.flaggedRecommendations,
    required this.recentWeeks,
  });

  final DateTime? generatedAt;
  final FounderMetricsWeek? latestWeek;
  final FounderMetricsWeek? previousWeek;
  final List<FounderLabeledMetric> interactionBreakdown;
  final List<FounderLabeledMetric> watchesBySubject;
  final List<FounderTapThroughMetric> notificationByEventType;
  final List<FounderTapThroughMetric> notificationByTier;
  final List<FounderLabeledMetric> onboardingLadder;
  final List<FounderDeliveryRecommendation> recommendations;
  final List<FounderDeliveryRecommendation> flaggedRecommendations;
  final List<FounderMetricsWeek> recentWeeks;

  factory FounderMetricsBundle.fromJson(Map<String, dynamic> json) {
    return FounderMetricsBundle(
      generatedAt: _parseDateTime(json['generated_at']),
      latestWeek: _parseWeek(json['latest_week']),
      previousWeek: _parseWeek(json['previous_week']),
      interactionBreakdown: _parseLabeledMetrics(json['interaction_breakdown']),
      watchesBySubject: _parseLabeledMetrics(json['watches_by_subject']),
      notificationByEventType: _parseTapThroughMetrics(
        json['notification_by_event_type'],
      ),
      notificationByTier: _parseTapThroughMetrics(json['notification_by_tier']),
      onboardingLadder: _parseLabeledMetrics(json['onboarding_ladder']),
      recommendations: _parseRecommendations(json['recommendations']),
      flaggedRecommendations: _parseRecommendations(
        json['flagged_recommendations'],
      ),
      recentWeeks: _parseWeeks(json['recent_weeks']),
    );
  }
}

class FounderMetricsWeek {
  const FounderMetricsWeek({
    required this.weekStart,
    required this.weekEnd,
    required this.generatedAt,
    required this.wauCount,
    required this.meaningfulInteractionCount,
    required this.meaningfulInteractionsPerWau,
    required this.activeUnmutedWatchesCount,
    required this.watchesPerWau,
    required this.watchMatchedEventCount,
    required this.eventsPerWatch,
    required this.ladderStartedCount,
    required this.ladderOwnedCount,
    required this.ladderWantedCount,
    required this.ladderFollowedCount,
    required this.ladderCompletedCount,
  });

  final DateTime? weekStart;
  final DateTime? weekEnd;
  final DateTime? generatedAt;
  final int wauCount;
  final int meaningfulInteractionCount;
  final double meaningfulInteractionsPerWau;
  final int activeUnmutedWatchesCount;
  final double watchesPerWau;
  final int watchMatchedEventCount;
  final double eventsPerWatch;
  final int ladderStartedCount;
  final int ladderOwnedCount;
  final int ladderWantedCount;
  final int ladderFollowedCount;
  final int ladderCompletedCount;

  factory FounderMetricsWeek.fromJson(Map<String, dynamic> json) {
    return FounderMetricsWeek(
      weekStart: _parseDateTime(json['week_start']),
      weekEnd: _parseDateTime(json['week_end']),
      generatedAt: _parseDateTime(json['generated_at']),
      wauCount: _parseInt(json['wau_count']),
      meaningfulInteractionCount: _parseInt(
        json['meaningful_interaction_count'],
      ),
      meaningfulInteractionsPerWau: _parseDouble(
        json['meaningful_interactions_per_wau'],
      ),
      activeUnmutedWatchesCount: _parseInt(
        json['active_unmuted_watches_count'],
      ),
      watchesPerWau: _parseDouble(json['watches_per_wau']),
      watchMatchedEventCount: _parseInt(json['watch_matched_event_count']),
      eventsPerWatch: _parseDouble(json['events_per_watch']),
      ladderStartedCount: _parseInt(json['ladder_started_count']),
      ladderOwnedCount: _parseInt(json['ladder_owned_count']),
      ladderWantedCount: _parseInt(json['ladder_wanted_count']),
      ladderFollowedCount: _parseInt(json['ladder_followed_count']),
      ladderCompletedCount: _parseInt(json['ladder_completed_count']),
    );
  }
}

class FounderLabeledMetric {
  const FounderLabeledMetric({
    required this.key,
    required this.label,
    required this.value,
    required this.rowCount,
  });

  final String key;
  final String label;
  final double value;
  final int rowCount;

  factory FounderLabeledMetric.fromJson(Map<String, dynamic> json) {
    return FounderLabeledMetric(
      key: json['key']?.toString() ?? '',
      label: json['label']?.toString() ?? 'Metric',
      value: _parseDouble(json['value']),
      rowCount: _parseInt(json['row_count']),
    );
  }
}

class FounderTapThroughMetric extends FounderLabeledMetric {
  const FounderTapThroughMetric({
    required super.key,
    required super.label,
    required super.value,
    required super.rowCount,
    required this.sentCount,
  });

  final int sentCount;

  factory FounderTapThroughMetric.fromJson(Map<String, dynamic> json) {
    return FounderTapThroughMetric(
      key: json['key']?.toString() ?? '',
      label: json['label']?.toString() ?? 'Notification',
      value: _parseDouble(json['value']),
      rowCount: _parseInt(json['row_count']),
      sentCount: _parseInt(json['sent_count']),
    );
  }
}

class FounderDeliveryRecommendation {
  const FounderDeliveryRecommendation({
    required this.weekStart,
    required this.eventType,
    required this.tier,
    required this.sentCount,
    required this.tapCount,
    required this.tapThroughRate,
    required this.recommendation,
    required this.threshold,
    required this.reason,
    required this.requiresFounderApproval,
    required this.founderApprovedAt,
  });

  final DateTime? weekStart;
  final String eventType;
  final String tier;
  final int sentCount;
  final int tapCount;
  final double tapThroughRate;
  final String recommendation;
  final double threshold;
  final String reason;
  final bool requiresFounderApproval;
  final DateTime? founderApprovedAt;

  factory FounderDeliveryRecommendation.fromJson(Map<String, dynamic> json) {
    return FounderDeliveryRecommendation(
      weekStart: _parseDateTime(json['week_start']),
      eventType: json['event_type']?.toString() ?? 'unknown',
      tier: json['tier']?.toString() ?? 'unknown',
      sentCount: _parseInt(json['sent_count']),
      tapCount: _parseInt(json['tap_count']),
      tapThroughRate: _parseDouble(json['tap_through_rate']),
      recommendation: json['recommendation']?.toString() ?? 'none',
      threshold: _parseDouble(json['threshold']),
      reason: json['reason']?.toString() ?? '',
      requiresFounderApproval: json['requires_founder_approval'] == true,
      founderApprovedAt: _parseDateTime(json['founder_approved_at']),
    );
  }
}

class FounderMetricsService {
  FounderMetricsService._();

  static Future<FounderMetricsBundle> load({SupabaseClient? client}) async {
    final sb = client ?? Supabase.instance.client;
    final user = sb.auth.currentUser;
    if (!FounderInsightService.isFounderUser(user)) {
      throw Exception(
        'Founder metrics are only available to the founder account.',
      );
    }

    final response = await sb.functions.invoke(
      _kFounderMetricsFunction,
      body: const <String, dynamic>{},
    );
    final data = _coerceJsonMap(response.data);

    if (response.status < 200 || response.status >= 300) {
      throw Exception(
        _extractError(data) ?? 'Founder metrics are unavailable right now.',
      );
    }
    if (data.isEmpty) {
      throw Exception('Founder metrics are unavailable right now.');
    }
    return FounderMetricsBundle.fromJson(data);
  }

  static String? _extractError(Map<String, dynamic> data) {
    final error = data['error']?.toString();
    if (error == 'forbidden') {
      return 'Founder metrics are only available to the founder account.';
    }
    return error;
  }
}

Map<String, dynamic> _coerceJsonMap(dynamic body) {
  if (body is Map<String, dynamic>) {
    return body;
  }
  if (body is Map) {
    return Map<String, dynamic>.from(body);
  }
  return const <String, dynamic>{};
}

List<FounderLabeledMetric> _parseLabeledMetrics(dynamic value) {
  if (value is! List) {
    return const <FounderLabeledMetric>[];
  }
  return value
      .whereType<Map>()
      .map(
        (row) => FounderLabeledMetric.fromJson(Map<String, dynamic>.from(row)),
      )
      .toList(growable: false);
}

List<FounderTapThroughMetric> _parseTapThroughMetrics(dynamic value) {
  if (value is! List) {
    return const <FounderTapThroughMetric>[];
  }
  return value
      .whereType<Map>()
      .map(
        (row) =>
            FounderTapThroughMetric.fromJson(Map<String, dynamic>.from(row)),
      )
      .toList(growable: false);
}

List<FounderDeliveryRecommendation> _parseRecommendations(dynamic value) {
  if (value is! List) {
    return const <FounderDeliveryRecommendation>[];
  }
  return value
      .whereType<Map>()
      .map(
        (row) => FounderDeliveryRecommendation.fromJson(
          Map<String, dynamic>.from(row),
        ),
      )
      .toList(growable: false);
}

List<FounderMetricsWeek> _parseWeeks(dynamic value) {
  if (value is! List) {
    return const <FounderMetricsWeek>[];
  }
  return value
      .whereType<Map>()
      .map((row) => FounderMetricsWeek.fromJson(Map<String, dynamic>.from(row)))
      .toList(growable: false);
}

FounderMetricsWeek? _parseWeek(dynamic value) {
  if (value is Map<String, dynamic>) {
    return FounderMetricsWeek.fromJson(value);
  }
  if (value is Map) {
    return FounderMetricsWeek.fromJson(Map<String, dynamic>.from(value));
  }
  return null;
}

DateTime? _parseDateTime(dynamic value) {
  if (value == null) {
    return null;
  }
  final parsed = DateTime.tryParse(value.toString());
  return parsed;
}

int _parseInt(dynamic value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.round();
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

double _parseDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }
  return double.tryParse(value?.toString() ?? '') ?? 0;
}
