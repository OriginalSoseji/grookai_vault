import 'dart:math';

import 'package:supabase_flutter/supabase_flutter.dart';

const founderOperationsClientVersion = 'FOUNDER_OPERATIONS_MOBILE_V1';

class FounderOperationsCounts {
  const FounderOperationsCounts({
    required this.needsAction,
    required this.running,
    required this.failed,
    required this.completed,
    required this.unhealthyAgents,
  });

  final int needsAction;
  final int running;
  final int failed;
  final int completed;
  final int unhealthyAgents;

  static const empty = FounderOperationsCounts(
    needsAction: 0,
    running: 0,
    failed: 0,
    completed: 0,
    unhealthyAgents: 0,
  );

  factory FounderOperationsCounts.fromJson(Map<String, dynamic> json) {
    return FounderOperationsCounts(
      needsAction: _int(json['needs_action']),
      running: _int(json['running']),
      failed: _int(json['failed']),
      completed: _int(json['completed']),
      unhealthyAgents: _int(json['unhealthy_agents']),
    );
  }
}

class FounderOperationsWorkItem {
  const FounderOperationsWorkItem({
    required this.id,
    required this.workItemKey,
    required this.version,
    required this.state,
    required this.workItemType,
    required this.actionType,
    required this.title,
    required this.summary,
    required this.domain,
    required this.riskLevel,
    required this.scope,
    required this.exclusions,
    required this.planPayload,
    required this.planFingerprint,
    required this.contractVersion,
    required this.requiresRecentAuth,
    required this.commandPolicy,
    required this.agentKey,
    required this.agentName,
    this.stateReason,
    this.sourceCommitSha,
    this.executorVersion,
    this.expiresAt,
    this.deferredUntil,
    this.createdAt,
    this.updatedAt,
    this.commandId,
    this.commandStatus,
    this.acknowledgedAt,
    this.snoozedUntil,
  });

  final String id;
  final String workItemKey;
  final int version;
  final String state;
  final String? stateReason;
  final String workItemType;
  final String actionType;
  final String title;
  final String summary;
  final String domain;
  final String riskLevel;
  final Map<String, dynamic> scope;
  final dynamic exclusions;
  final Map<String, dynamic> planPayload;
  final String planFingerprint;
  final String? sourceCommitSha;
  final String contractVersion;
  final String? executorVersion;
  final bool requiresRecentAuth;
  final Map<String, dynamic> commandPolicy;
  final DateTime? expiresAt;
  final DateTime? deferredUntil;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String agentKey;
  final String agentName;
  final String? commandId;
  final String? commandStatus;
  final DateTime? acknowledgedAt;
  final DateTime? snoozedUntil;

  bool get executionEnabled => commandPolicy['execution_enabled'] == true;
  Map<String, dynamic> get outcomeWorkflow =>
      _map(planPayload['outcome_workflow']);
  bool get isOutcomeWorkflow =>
      outcomeWorkflow['version'] == 'FOUNDER_OUTCOME_WORKFLOW_V1';
  List<Map<String, dynamic>> get outcomeStages =>
      _mapList(outcomeWorkflow['stages']);
  bool get isActionable => state == 'ready_for_review' || state == 'deferred';
  bool get isRetryable => state == 'failed';

  factory FounderOperationsWorkItem.fromJson(Map<String, dynamic> json) {
    return FounderOperationsWorkItem(
      id: _text(json['id']),
      workItemKey: _text(json['work_item_key']),
      version: _int(json['version']),
      state: _text(json['state']),
      stateReason: _nullableText(json['state_reason']),
      workItemType: _text(json['work_item_type']),
      actionType: _text(json['action_type']),
      title: _text(json['title']),
      summary: _text(json['summary']),
      domain: _text(json['domain']),
      riskLevel: _text(json['risk_level']),
      scope: _map(json['scope']),
      exclusions: json['exclusions'],
      planPayload: _map(json['plan_payload']),
      planFingerprint: _text(json['plan_fingerprint']),
      sourceCommitSha: _nullableText(json['source_commit_sha']),
      contractVersion: _text(json['contract_version']),
      executorVersion: _nullableText(json['executor_version']),
      requiresRecentAuth: json['requires_recent_auth'] == true,
      commandPolicy: _map(json['command_policy']),
      expiresAt: _date(json['expires_at']),
      deferredUntil: _date(json['deferred_until']),
      createdAt: _date(json['created_at']),
      updatedAt: _date(json['updated_at']),
      agentKey: _text(json['agent_key']),
      agentName: _text(json['agent_name']),
      commandId: _nullableText(json['command_id']),
      commandStatus: _nullableText(json['command_status']),
      acknowledgedAt: _date(json['acknowledged_at']),
      snoozedUntil: _date(json['snoozed_until']),
    );
  }
}

class FounderOperationsAgentHealth {
  const FounderOperationsAgentHealth({
    required this.agentKey,
    required this.displayName,
    required this.domain,
    required this.executionPlatform,
    required this.sourceLocator,
    required this.health,
    required this.isPaused,
    required this.staleAfterSeconds,
    this.pausedReason,
    this.lastHeartbeatAt,
    this.lastSuccessAt,
    this.latestRunStatus,
    this.latestRunAt,
  });

  final String agentKey;
  final String displayName;
  final String domain;
  final String executionPlatform;
  final String sourceLocator;
  final String health;
  final bool isPaused;
  final String? pausedReason;
  final DateTime? lastHeartbeatAt;
  final DateTime? lastSuccessAt;
  final int staleAfterSeconds;
  final String? latestRunStatus;
  final DateTime? latestRunAt;

  factory FounderOperationsAgentHealth.fromJson(Map<String, dynamic> json) {
    return FounderOperationsAgentHealth(
      agentKey: _text(json['agent_key']),
      displayName: _text(json['display_name']),
      domain: _text(json['domain']),
      executionPlatform: _text(json['execution_platform']),
      sourceLocator: _text(json['source_locator']),
      health: _text(json['health']),
      isPaused: json['is_paused'] == true,
      pausedReason: _nullableText(json['paused_reason']),
      lastHeartbeatAt: _date(json['last_heartbeat_at']),
      lastSuccessAt: _date(json['last_success_at']),
      staleAfterSeconds: _int(json['stale_after_seconds']),
      latestRunStatus: _nullableText(json['latest_run_status']),
      latestRunAt: _date(json['latest_run_at']),
    );
  }
}

class FounderOperationsWorkItemDetail {
  const FounderOperationsWorkItemDetail({
    required this.workItem,
    required this.agent,
    required this.evidence,
    required this.decisions,
    required this.events,
    required this.command,
    required this.workflowStages,
  });

  final Map<String, dynamic> workItem;
  final Map<String, dynamic> agent;
  final List<Map<String, dynamic>> evidence;
  final List<Map<String, dynamic>> decisions;
  final List<Map<String, dynamic>> events;
  final Map<String, dynamic>? command;
  final List<Map<String, dynamic>> workflowStages;

  factory FounderOperationsWorkItemDetail.fromJson(Map<String, dynamic> json) {
    return FounderOperationsWorkItemDetail(
      workItem: _map(json['work_item']),
      agent: _map(json['agent']),
      evidence: _mapList(json['evidence']),
      decisions: _mapList(json['decisions']),
      events: _mapList(json['events']),
      command: json['command'] is Map ? _map(json['command']) : null,
      workflowStages: _mapList(json['workflow_stages']),
    );
  }
}

class FounderOperationsDecisionResult {
  const FounderOperationsDecisionResult({
    required this.workItemId,
    required this.workItemState,
    required this.decisionId,
    required this.duplicate,
    this.commandId,
    this.commandStatus,
  });

  final String workItemId;
  final String workItemState;
  final String decisionId;
  final String? commandId;
  final String? commandStatus;
  final bool duplicate;

  factory FounderOperationsDecisionResult.fromJson(Map<String, dynamic> json) {
    return FounderOperationsDecisionResult(
      workItemId: _text(json['work_item_id']),
      workItemState: _text(json['work_item_state']),
      decisionId: _text(json['decision_id']),
      commandId: _nullableText(json['command_id']),
      commandStatus: _nullableText(json['command_status']),
      duplicate: json['duplicate'] == true,
    );
  }
}

class FounderOperationsService {
  FounderOperationsService({required SupabaseClient client}) : _client = client;

  final SupabaseClient _client;
  final Random _random = Random.secure();

  Future<FounderOperationsCounts> fetchCounts() async {
    final response = await _client.rpc('founder_operations_counts_v1');
    final row = _firstMap(response);
    return row == null
        ? FounderOperationsCounts.empty
        : FounderOperationsCounts.fromJson(row);
  }

  Future<List<FounderOperationsWorkItem>> fetchWorkItems({
    String queue = 'needs_action',
    int limit = 50,
  }) async {
    final response = await _client.rpc(
      'founder_operations_work_items_v1',
      params: <String, dynamic>{
        'p_queue': queue,
        'p_limit': limit.clamp(1, 100).toInt(),
      },
    );
    return (response is List ? response : const <dynamic>[])
        .whereType<Map>()
        .map(
          (row) => FounderOperationsWorkItem.fromJson(
            Map<String, dynamic>.from(row),
          ),
        )
        .where((item) => item.id.isNotEmpty)
        .toList(growable: false);
  }

  Future<FounderOperationsWorkItemDetail> fetchWorkItem(
    String workItemId,
  ) async {
    final response = await _client.rpc(
      'founder_operations_work_item_v1',
      params: <String, dynamic>{'p_work_item_id': workItemId.trim()},
    );
    final row = response is Map
        ? Map<String, dynamic>.from(response)
        : _firstMap(response);
    if (row == null) throw StateError('Founder work item was not found.');
    return FounderOperationsWorkItemDetail.fromJson(row);
  }

  Future<List<FounderOperationsAgentHealth>> fetchAgentHealth() async {
    final response = await _client.rpc('founder_operations_agent_health_v1');
    return (response is List ? response : const <dynamic>[])
        .whereType<Map>()
        .map(
          (row) => FounderOperationsAgentHealth.fromJson(
            Map<String, dynamic>.from(row),
          ),
        )
        .toList(growable: false);
  }

  Future<void> controlAgent({
    required FounderOperationsAgentHealth agent,
    required bool pause,
    required String note,
  }) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) throw StateError('Authentication is required.');
    final normalizedNote = note.trim();
    if (normalizedNote.length < 3) {
      throw ArgumentError('A reason is required.');
    }
    final idempotencyKey =
        'fo-agent-$userId-${DateTime.now().microsecondsSinceEpoch}-${_random.nextInt(1 << 31)}';
    final response = await _client.rpc(
      'founder_operations_control_agent_v1',
      params: <String, dynamic>{
        'p_agent_key': agent.agentKey,
        'p_action': pause ? 'pause_agent' : 'resume_agent',
        'p_note': normalizedNote,
        'p_idempotency_key': idempotencyKey,
        'p_client_schema_version': founderOperationsClientVersion,
      },
    );
    if (_firstMap(response) == null) {
      throw StateError('Agent control returned no result.');
    }
  }

  Future<FounderOperationsDecisionResult> decide({
    required FounderOperationsWorkItem item,
    required String decision,
    String? note,
    DateTime? deferUntil,
  }) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) throw StateError('Authentication is required.');
    final idempotencyKey =
        'fo-$userId-${DateTime.now().microsecondsSinceEpoch}-${_random.nextInt(1 << 31)}';
    final response = await _client.rpc(
      'founder_operations_decide_v1',
      params: <String, dynamic>{
        'p_work_item_id': item.id,
        'p_expected_version': item.version,
        'p_expected_fingerprint': item.planFingerprint,
        'p_decision': decision,
        'p_idempotency_key': idempotencyKey,
        'p_client_schema_version': founderOperationsClientVersion,
        'p_note': _nullableText(note),
        'p_defer_until': deferUntil?.toUtc().toIso8601String(),
      },
    );
    final row = _firstMap(response);
    if (row == null) throw StateError('Founder decision returned no result.');
    return FounderOperationsDecisionResult.fromJson(row);
  }
}

Map<String, dynamic>? _firstMap(dynamic value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  if (value is List && value.isNotEmpty && value.first is Map) {
    return Map<String, dynamic>.from(value.first as Map);
  }
  return null;
}

Map<String, dynamic> _map(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

List<Map<String, dynamic>> _mapList(dynamic value) =>
    (value is List ? value : const <dynamic>[])
        .whereType<Map>()
        .map((entry) => Map<String, dynamic>.from(entry))
        .toList(growable: false);

String _text(dynamic value) => value?.toString().trim() ?? '';
String? _nullableText(dynamic value) {
  final text = _text(value);
  return text.isEmpty ? null : text;
}

int _int(dynamic value) =>
    value is num ? value.toInt() : int.tryParse(_text(value)) ?? 0;
DateTime? _date(dynamic value) =>
    value is DateTime ? value : DateTime.tryParse(_text(value));
