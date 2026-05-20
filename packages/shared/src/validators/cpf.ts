export function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) return false;

  // Reject sequences of identical digits (00000000000 … 99999999999)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const d = digits.split('').map(Number);

  // Check digit 1: weighted sum of first 9 digits (weights 10..2)
  const sum1 = d.slice(0, 9).reduce((acc, n, i) => acc + n * (10 - i), 0);
  const rem1 = sum1 % 11;
  const check1 = rem1 < 2 ? 0 : 11 - rem1;
  if (d[9] !== check1) return false;

  // Check digit 2: weighted sum of first 10 digits (weights 11..2)
  const sum2 = d.slice(0, 10).reduce((acc, n, i) => acc + n * (11 - i), 0);
  const rem2 = sum2 % 11;
  const check2 = rem2 < 2 ? 0 : 11 - rem2;
  if (d[10] !== check2) return false;

  return true;
}
