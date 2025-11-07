extension SupaTimeout<T> on Future<T> {
  Future<T> withReadTimeout([Duration? d]) => timeout(d ?? const Duration(seconds: 10));
}

