class CopyDetailNavigationPolicy {
  const CopyDetailNavigationPolicy._();

  static bool shouldReturnToSource({
    required bool openedFromCopyDetail,
    required String? sourceGvviId,
    required String? targetGvviId,
  }) {
    if (!openedFromCopyDetail) {
      return false;
    }

    final source = (sourceGvviId ?? '').trim();
    if (source.isEmpty) {
      // Card-level copy management can represent more than one exact copy.
      return true;
    }

    final target = (targetGvviId ?? '').trim();
    return target.isNotEmpty && target == source;
  }
}
