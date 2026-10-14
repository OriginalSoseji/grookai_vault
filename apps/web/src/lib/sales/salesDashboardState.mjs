export const SALES_REPORT_PAGE_SIZE = 50;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function toParams(input) {
  if (input instanceof URLSearchParams || typeof input === 'string') return new URLSearchParams(input);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input ?? {})) {
    const candidate = Array.isArray(value) ? value[0] : value;
    if (typeof candidate === 'string') params.set(key, candidate);
  }
  return params;
}

function validDate(value) {
  if (!datePattern.test(value ?? '')) return '';
  const date = new Date(value + 'T00:00:00');
  return Number.isFinite(+date) && date.getFullYear() === Number(value.slice(0, 4))
    && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10)) ? value : '';
}

export function readSalesDashboardParams(input, today, allowedMethods = []) {
  const params = toParams(input);
  const rawPage = Number(params.get('sales_page'));
  const method = params.get('sales_method') ?? '';
  return {
    from: validDate(params.get('sales_from')) || today,
    to: validDate(params.get('sales_to')) || today,
    query: (params.get('sales_q') ?? '').slice(0, 200),
    method: allowedMethods.includes(method) ? method : '',
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

export function writeSalesDashboardParams(input, state) {
  const params = new URLSearchParams(toParams(input));
  const values = {
    sales_from: state.from,
    sales_to: state.to,
    sales_q: state.query.trim(),
    sales_method: state.method,
    sales_page: state.page > 1 ? String(state.page) : '',
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value); else params.delete(key);
  }
  return params;
}

export function salesDashboardDestination(input, allowedMethods = []) {
  const source = toParams(input);
  if (source.get('view') !== 'dashboard') return '/account/store/sales';
  const params = new URLSearchParams({ view: 'dashboard' });
  const from = validDate(source.get('sales_from'));
  const to = validDate(source.get('sales_to'));
  const query = (source.get('sales_q') ?? '').slice(0, 200);
  const method = source.get('sales_method') ?? '';
  const page = Number(source.get('sales_page'));
  if (from) params.set('sales_from', from);
  if (to) params.set('sales_to', to);
  if (query) params.set('sales_q', query);
  if (allowedMethods.includes(method)) params.set('sales_method', method);
  if (Number.isSafeInteger(page) && page > 1) params.set('sales_page', String(page));
  return `/account/store/sales?${params}`;
}

export function paginateSalesRows(rows, requestedPage, pageSize = SALES_REPORT_PAGE_SIZE) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw Error('Page size must be a positive integer.');
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(Number.isSafeInteger(requestedPage) ? requestedPage : 1, 1), pageCount);
  const start = (page - 1) * pageSize;
  return { page, pageCount, start, end: Math.min(start + pageSize, rows.length), rows: rows.slice(start, start + pageSize) };
}
