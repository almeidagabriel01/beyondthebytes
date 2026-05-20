import { isValidCpf } from './cpf';

describe('isValidCpf', () => {
  // ── Valid CPFs ────────────────────────────────────────────────────────────
  it('accepts a valid CPF with formatting', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });

  it('accepts a valid CPF as plain digits', () => {
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('accepts another valid CPF', () => {
    expect(isValidCpf('111.444.777-35')).toBe(true);
  });

  it('accepts a CPF whose first check digit is 0 (remainder < 2)', () => {
    // 12345678909 — remainder for d1 = 1 < 2, so d1 = 0
    expect(isValidCpf('123.456.789-09')).toBe(true);
  });

  // ── Invalid — sequence ────────────────────────────────────────────────────
  it('rejects all-zeros CPF', () => {
    expect(isValidCpf('000.000.000-00')).toBe(false);
  });

  it('rejects all-ones CPF', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('rejects all-twos CPF', () => {
    expect(isValidCpf('222.222.222-22')).toBe(false);
  });

  it('rejects all-nines CPF', () => {
    expect(isValidCpf('999.999.999-99')).toBe(false);
  });

  // ── Invalid — wrong check digits ──────────────────────────────────────────
  it('rejects CPF with wrong first check digit', () => {
    // 52998224715: last two digits changed to 15 instead of 25
    expect(isValidCpf('529.982.247-15')).toBe(false);
  });

  it('rejects CPF with wrong second check digit', () => {
    // 52998224724: second check digit changed to 4 instead of 5
    expect(isValidCpf('529.982.247-24')).toBe(false);
  });

  it('rejects CPF with both check digits wrong', () => {
    expect(isValidCpf('123.456.789-00')).toBe(false);
  });

  // ── Invalid — length ──────────────────────────────────────────────────────
  it('rejects CPF with 10 digits', () => {
    expect(isValidCpf('1234567890')).toBe(false);
  });

  it('rejects CPF with 12 digits', () => {
    expect(isValidCpf('123456789012')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidCpf('')).toBe(false);
  });
});
