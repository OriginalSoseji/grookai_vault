class LoadState<T> {
  final T? data;
  final String? error;
  final bool loading;

  const LoadState._({this.data, this.error, required this.loading});

  factory LoadState.idle() => const LoadState._(loading: false);
  factory LoadState.loading() => const LoadState._(loading: true);
  factory LoadState.data(T value) => LoadState._(data: value, loading: false);
  factory LoadState.error(String message) =>
      LoadState._(error: message, loading: false);

  bool get hasData => data != null && error == null;
  bool get hasError => error != null;
}

