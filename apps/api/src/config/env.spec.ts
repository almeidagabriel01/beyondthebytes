import { parseEnv } from './env.schema';

describe('parseEnv', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    NODE_ENV: 'test',
    PORT: '3001',
    CORS_ORIGIN: 'http://localhost:3000',
    JWT_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  it('returns parsed env with coerced PORT number', () => {
    const result = parseEnv(validEnv);
    expect(result.PORT).toBe(3001);
    expect(result.NODE_ENV).toBe('test');
  });

  it('throws on missing DATABASE_URL', () => {
    const { DATABASE_URL: _unused, ...rest } = validEnv;
    void _unused;
    expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('throws when JWT_SECRET is too short', () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_REFRESH_SECRET is too short', () => {
    expect(() => parseEnv({ ...validEnv, JWT_REFRESH_SECRET: 'short' })).toThrow(
      /JWT_REFRESH_SECRET/,
    );
  });

  it('applies defaults for optional fields', () => {
    const minimal = {
      DATABASE_URL: validEnv.DATABASE_URL,
      JWT_SECRET: validEnv.JWT_SECRET,
      JWT_REFRESH_SECRET: validEnv.JWT_REFRESH_SECRET,
    };
    const result = parseEnv(minimal);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3001);
    expect(result.CORS_ORIGIN).toBe('http://localhost:3000');
  });
});
