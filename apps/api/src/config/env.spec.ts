describe('validateEnv', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    NODE_ENV: 'test',
    PORT: '3001',
    CORS_ORIGIN: 'http://localhost:3000',
    JWT_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  beforeEach(() => {
    jest.resetModules();
    Object.assign(process.env, validEnv);
  });

  afterEach(() => {
    for (const key of Object.keys(validEnv)) {
      delete process.env[key];
    }
  });

  it('returns parsed env with coerced PORT number', async () => {
    const { validateEnv } = await import('./env');
    const result = validateEnv();
    expect(result.PORT).toBe(3001);
    expect(result.NODE_ENV).toBe('test');
  });

  it('calls process.exit(1) on missing DATABASE_URL', async () => {
    delete process.env['DATABASE_URL'];
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow('process.exit called');
    exitSpy.mockRestore();
  });

  it('calls process.exit(1) when JWT_SECRET is too short', async () => {
    process.env['JWT_SECRET'] = 'short';
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow('process.exit called');
    exitSpy.mockRestore();
  });
});
