sealed class Result<T> {
  const Result();
  bool get isOk => this is Ok<T>;
  bool get isErr => this is Err<T>;
  T? get data => this is Ok<T> ? (this as Ok<T>).value : null;
  String? get message => this is Err<T> ? (this as Err<T>).message : null;
}

class Ok<T> extends Result<T> {
  final T value;
  const Ok(this.value);
}

class Err<T> extends Result<T> {
  @override
  final String message;
  final int? code;
  const Err(this.message, {this.code});
}
