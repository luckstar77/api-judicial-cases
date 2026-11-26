import { buildTypeOrmOptions } from './typeorm-options';

describe('buildTypeOrmOptions', () => {
  const options = buildTypeOrmOptions({ host: '127.0.0.1', port: 3306, username: 'root', password: '', database: 'rental' });

  it('should close idle pool connections before MySQL wait_timeout drops them', () => {
    expect(options).toMatchObject({ extra: { enableKeepAlive: true, idleTimeout: 60_000, maxIdle: 2 } });
  });

  it('should never synchronize the schema and only run migrations when asked', () => {
    expect(options).toMatchObject({ synchronize: false, migrationsRun: false, timezone: 'Z' });
    expect(buildTypeOrmOptions({ host: 'h', port: 1, username: 'u', password: 'p', database: 'd', runMigrations: true }).migrationsRun).toBe(true);
  });
});
