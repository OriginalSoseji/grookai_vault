export const SALES_REPORT_PAGE_SIZE = 50;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (!datePattern.test(value ?? '')) return '';
  const date = new Date(value + 'T00:00:00');
  return Number.isFinite(+date) && date.getFullYear() === Number(value.slice(0, 4))
    && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10)) ? value : '';
}

export function readSalesDashboardParams(input, today, allowedMethods = []) {
  const params = input instanceof URLSearchParams ? input : new URLSearchParams(input);
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
  const params = input instanceof URLSearchParams ? new URLSearchParams(input) : new URLSearchParams(input);
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

export function paginateSalesRows(rows, requestedPage, pageSize = SALES_REPORT_PAGE_SIZE) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw Error('Page size must be a positive integer.');
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(Number.isSafeInteger(requestedPage) ? requestedPage : 1, 1), pageCount);
  const start = (page - 1) * pageSize;
  return { page, pageCount, start, end: Math.min(start + pageSize, rows.length), rows: rows.slice(start, start + pageSize) };
}
