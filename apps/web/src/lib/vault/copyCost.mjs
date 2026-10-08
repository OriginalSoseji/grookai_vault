export const isCostId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/** Exact decimal input. No floating-point conversion, rounding or assumed currency. */
export function parseCopyCost(amountInput, currencyInput) {
  if (typeof amountInput !== 'string' || typeof currencyInput !== 'string') throw Error('Enter a cost and its currency.');
  const amount = amountInput.trim(), currency = currencyInput.trim().toUpperCase();
  if (!amount && !currency) return {amount: null, currency: null, minor: null};
  if (!amount || !currency) throw Error('Enter both the cost and its currency, or mark the cost unknown.');
  if (!/^(?:\d{1,32}(?:\.\d{0,32})?|\.\d{1,32})$/.test(amount)) throw Error('Use a nonnegative amount with at most two decimal places.');
  if (!/^[A-Z]{3}$/.test(currency)) throw Error('Choose the three-letter cost currency.');
  const [whole, fraction = ''] = amount.split('.');
  if (/[1-9]/.test(fraction.slice(2))) throw Error('Use a nonnegative amount with at most two decimal places.');
  const minor = BigInt(whole || '0') * 100n + BigInt(fraction.slice(0,2).padEnd(2, '0'));
  if (minor > 999999999999n) throw Error('Cost must be no more than 9,999,999,999.99.');
  return {amount: `${minor / 100n}.${String(minor % 100n).padStart(2, '0')}`, currency, minor: String(minor)};
}

export function validateCostRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid cost request.');
  const keys = ['ownerId','requestId','instanceId','expectedAmount','expectedCurrency','amount','currency'];
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw Error('Invalid cost request.');
  if (![value.ownerId,value.requestId,value.instanceId].every(isCostId)) throw Error('Invalid cost request.');
  if (value.expectedAmount !== null && (typeof value.expectedAmount !== 'string' || value.expectedAmount.length > 4096 || !/^(?:-?\d+(?:\.\d+)?|NaN|Infinity|-Infinity)$/.test(value.expectedAmount))) throw Error('The previous cost needs review.');
  if (value.expectedCurrency !== null && (typeof value.expectedCurrency !== 'string' || value.expectedCurrency.length > 1000)) throw Error('The previous currency needs review.');
  if ((value.amount !== null && typeof value.amount !== 'string') || (value.currency !== null && typeof value.currency !== 'string')) throw Error('Invalid cost request.');
  const parsed = parseCopyCost(value.amount ?? '', value.currency ?? '');
  if (parsed.amount !== value.amount || parsed.currency !== value.currency) throw Error('Cost request must use its exact confirmed amount and currency.');
  return value;
}

export function isCostEvidence(value) {
  return Boolean(value && typeof value === 'object' &&
    (value.amount === null || typeof value.amount === 'string') &&
    (value.currency === null || typeof value.currency === 'string') &&
    typeof value.status === 'string' && (value.minor === null || (typeof value.minor === 'string' && /^\d{1,12}$/.test(value.minor))));
}

export function confirmedCostResult(result, request) {
  if (!result || result.ownerId !== request.ownerId || result.requestId !== request.requestId || result.instanceId !== request.instanceId || !isCostEvidence(result.cost)) return false;
  const expected = parseCopyCost(request.amount ?? '', request.currency ?? '');
  if(expected.amount===null)return result.cost.amount===null && result.cost.currency===null && result.cost.minor===null;
  try {
    const actual=parseCopyCost(result.cost.amount,result.cost.currency);
    return result.cost.status==='known' && actual.currency===expected.currency && actual.minor===expected.minor && result.cost.minor===expected.minor;
  } catch {return false;}
}

export function costStatusLabel(cost) {
  if (!cost || cost.status === 'missing_amount') return 'Cost unknown';
  if (cost.status === 'missing_currency') return 'Cost currency needed';
  if (cost.status !== 'known') return 'Cost needs review';
  return `${cost.currency} ${cost.amount}`;
}
