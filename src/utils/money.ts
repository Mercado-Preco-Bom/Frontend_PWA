export function parseMoney(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
  }

  const text = value.replace(/[^\d.,]/g, '');
  if (!/\d/.test(text)) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  const commas = text.split(',').length - 1;
  const dots = text.split('.').length - 1;
  let normalized = text;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = text.split(thousandSeparator).join('').replace(decimalSeparator, '.');
  } else if (lastComma >= 0) {
    normalized = commas > 1 ? text.split(',').join('') : text.replace(',', '.');
  } else if (lastDot >= 0 && dots > 1) {
    normalized = text.split('.').join('');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

export function formatBRL(value: string | number | null | undefined): string {
  const amount = typeof value === 'string' ? parseMoney(value) : value;
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
