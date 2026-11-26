import { resolveCorsOrigins } from './app.setup';

describe('resolveCorsOrigins', () => {
  it('should only allow the production site in production when CORS_ORIGINS is not set', () => {
    expect(resolveCorsOrigins(undefined, 'production')).toEqual(['https://rental.imallenlai.com']);
  });

  it('should also allow local frontends outside production', () => {
    expect(resolveCorsOrigins(undefined, 'development')).toEqual(expect.arrayContaining(['https://rental.imallenlai.com', 'http://localhost:5173']));
  });

  it('should use the configured list when CORS_ORIGINS is set', () => {
    expect(resolveCorsOrigins(' https://a.example , ,https://b.example', 'production')).toEqual(['https://a.example', 'https://b.example']);
  });
});
