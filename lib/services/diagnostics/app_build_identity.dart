class AppBuildIdentity {
  const AppBuildIdentity._();

  static const String sourceCommitSha = String.fromEnvironment(
    'GROOKAI_SOURCE_COMMIT_SHA',
    defaultValue: 'local-unversioned',
  );

  static const String buildRunId = String.fromEnvironment(
    'GROOKAI_BUILD_RUN_ID',
    defaultValue: 'local',
  );

  static bool get hasGovernedSourceCommit =>
      RegExp(r'^[0-9a-f]{40}$').hasMatch(sourceCommitSha);
}
