/// Exact private acquisition cost; asking prices and public receipts are separate.
class CopyCostInput {
  const CopyCostInput(this.amount, this.currency, this.minor);
  final String? amount, currency, minor;

  static CopyCostInput parse(String amountText, String currencyText) {
    final amount = amountText.trim();
    final currency = currencyText.trim().toUpperCase();
    if (amount.isEmpty && currency.isEmpty) {
      return const CopyCostInput(null, null, null);
    }
    if (amount.isEmpty || currency.isEmpty) {
      throw const FormatException(
        'Enter both the cost and its currency, or mark the cost unknown.',
      );
    }
    if (!RegExp(r'^(?:\d{1,32}(?:\.\d{0,32})?|\.\d{1,32})$').hasMatch(amount)) {
      throw const FormatException(
        'Use a nonnegative amount with at most two decimal places.',
      );
    }
    if (!RegExp(r'^[A-Z]{3}$').hasMatch(currency)) {
      throw const FormatException('Enter the three-letter cost currency.');
    }
    final parts = amount.split('.');
    final fraction = parts.length == 2 ? parts[1] : '';
    if (fraction.length > 2 &&
        RegExp('[1-9]').hasMatch(fraction.substring(2))) {
      throw const FormatException(
        'Use at most two decimal places; costs are never rounded.',
      );
    }
    final cents =
        BigInt.parse(parts[0].isEmpty ? '0' : parts[0]) * BigInt.from(100) +
        BigInt.parse(fraction.padRight(2, '0').substring(0, 2));
    if (cents > BigInt.parse('999999999999')) {
      throw const FormatException(
        'Cost must be no more than 9,999,999,999.99.',
      );
    }
    return CopyCostInput(
      '${cents ~/ BigInt.from(100)}.${(cents % BigInt.from(100)).toString().padLeft(2, '0')}',
      currency,
      cents.toString(),
    );
  }
}

bool isCopyCostId(Object? value) =>
    value is String &&
    RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
      caseSensitive: false,
    ).hasMatch(value);

class CopyCostEvidence {
  const CopyCostEvidence({
    required this.amount,
    required this.currency,
    required this.minor,
    required this.status,
  });
  final String? amount, currency, minor;
  final String status;

  factory CopyCostEvidence.fromJson(Object? value) {
    if (value is! Map ||
        !(value['amount'] == null || value['amount'] is String) ||
        !(value['currency'] == null || value['currency'] is String) ||
        !(value['minor'] == null ||
            value['minor'] is String &&
                RegExp(r'^\d{1,12}$').hasMatch(value['minor'] as String)) ||
        value['status'] is! String) {
      throw const FormatException('Recorded cost could not be verified.');
    }
    return CopyCostEvidence(
      amount: value['amount'] as String?,
      currency: value['currency'] as String?,
      minor: value['minor'] as String?,
      status: value['status'] as String,
    );
  }

  String get label {
    if (status == 'missing_amount') return 'Cost unknown';
    if (status == 'missing_currency') return 'Cost currency needed';
    if (status != 'known') return 'Cost needs review';
    try {
      final input = CopyCostInput.parse(amount ?? '', currency ?? '');
      if (input.minor == null || input.minor != minor) {
        return 'Cost needs review';
      }
      return '${input.currency} ${input.amount}';
    } on FormatException {
      return 'Cost needs review';
    }
  }
}

class CopyCostRequest {
  CopyCostRequest({
    required this.ownerId,
    required this.requestId,
    required this.instanceId,
    required this.expectedAmount,
    required this.expectedCurrency,
    required this.amount,
    required this.currency,
  }) {
    if (![ownerId, requestId, instanceId].every(isCopyCostId)) {
      throw const FormatException('Invalid cost request identity.');
    }
    // Legacy numeric evidence is preserved verbatim for the server's compare-and-save.
    if (expectedAmount != null &&
        (expectedAmount!.length > 4096 ||
            !RegExp(
              r'^(?:-?\d+(?:\.\d+)?|NaN|Infinity|-Infinity)$',
            ).hasMatch(expectedAmount!))) {
      throw const FormatException('The previous cost needs review.');
    }
    if (expectedCurrency != null && expectedCurrency!.length > 1000) {
      throw const FormatException('The previous currency needs review.');
    }
    final input = CopyCostInput.parse(amount ?? '', currency ?? '');
    if (input.amount != amount || input.currency != currency) {
      throw const FormatException(
        'The saved request must use its exact confirmed cost and currency.',
      );
    }
  }
  final String ownerId, requestId, instanceId;
  final String? expectedAmount, expectedCurrency, amount, currency;

  Map<String, dynamic> toJson() => {
    'ownerId': ownerId,
    'requestId': requestId,
    'instanceId': instanceId,
    'expectedAmount': expectedAmount,
    'expectedCurrency': expectedCurrency,
    'amount': amount,
    'currency': currency,
  };

  factory CopyCostRequest.fromJson(Object? value) {
    const keys = {
      'ownerId',
      'requestId',
      'instanceId',
      'expectedAmount',
      'expectedCurrency',
      'amount',
      'currency',
    };
    if (value is! Map ||
        value.length != keys.length ||
        !keys.every(value.containsKey) ||
        ![
          value['ownerId'],
          value['requestId'],
          value['instanceId'],
        ].every(isCopyCostId) ||
        ![
          'expectedAmount',
          'expectedCurrency',
          'amount',
          'currency',
        ].every((key) => value[key] == null || value[key] is String)) {
      throw const FormatException('The saved cost request needs review.');
    }
    return CopyCostRequest(
      ownerId: value['ownerId'] as String,
      requestId: value['requestId'] as String,
      instanceId: value['instanceId'] as String,
      expectedAmount: value['expectedAmount'] as String?,
      expectedCurrency: value['expectedCurrency'] as String?,
      amount: value['amount'] as String?,
      currency: value['currency'] as String?,
    );
  }

  bool confirms(Object? result) {
    if (result is! Map ||
        result['ownerId'] != ownerId ||
        result['requestId'] != requestId ||
        result['instanceId'] != instanceId) {
      return false;
    }
    try {
      final cost = CopyCostEvidence.fromJson(result['cost']);
      if (amount == null) {
        return cost.amount == null &&
            cost.currency == null &&
            cost.minor == null &&
            cost.status == 'missing_amount';
      }
      final expected = CopyCostInput.parse(amount!, currency!);
      final actual = CopyCostInput.parse(
        cost.amount ?? '',
        cost.currency ?? '',
      );
      return cost.status == 'known' &&
          actual.currency == expected.currency &&
          actual.minor == expected.minor &&
          cost.minor == expected.minor;
    } on FormatException {
      return false;
    }
  }

  Map<String, dynamic> get rpcParams => {
    'p_request_id': requestId,
    'p_instance_id': instanceId,
    'p_expected_amount': expectedAmount,
    'p_expected_currency': expectedCurrency,
    'p_amount': amount,
    'p_currency': currency,
  };
}
