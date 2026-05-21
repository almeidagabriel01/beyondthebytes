/**
 * Format a digit-stream as a BRL currency string while typing.
 *
 * Strips non-digits, treats the digits as cents, then formats with R$ prefix.
 * Empty input yields an empty string so the placeholder shows.
 *
 * Example: maskCurrency("12345") → "R$ 123,45"
 */
export function maskCurrency(v: string): string {
  const digits = v.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Parse a BRL-masked string back to a number.
 *
 * Returns `undefined` when the result is non-positive or unparseable, so callers
 * can omit the field from API payloads instead of sending zero.
 */
export function parseCurrency(masked: string): number | undefined {
  const raw = masked.replace(/[^\d,]/g, '').replace(',', '.');
  const n = parseFloat(raw);
  return isNaN(n) || n <= 0 ? undefined : n;
}

/**
 * Convert a numeric value (e.g. 250) to the masked display form ("R$ 250,00").
 *
 * Used to seed an `<input>` with a pre-existing numeric value so the user sees
 * the same formatting they'd produce by typing.
 */
export function formatCurrencyValue(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
