/** Never infer a test database from the application's configured production URL. */
export function requireIntegrationDatabaseUrl(env: Record<string, string | undefined>): string {
  const value = env.ACADEMY_TEST_DATABASE_URL?.trim();
  if (!value) throw new Error("An explicit local ACADEMY_TEST_DATABASE_URL is required for database acceptance tests.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("The integration database must be a valid local PostgreSQL test URL."); }
  if (!['postgresql:', 'postgres:'].includes(url.protocol) || url.hostname !== '127.0.0.1' ||
      decodeURIComponent(url.username) !== 'academy_test' || !/^\/learnlikeadev_test_[a-z0-9]+$/.test(url.pathname) ||
      !url.port || Number(url.port) < 1 || Number(url.port) > 65535 || url.hash || url.search) {
    throw new Error("Database acceptance requires 127.0.0.1, an explicit port, the academy_test role, and a learnlikeadev_test_<suffix> database; remote and application targets are forbidden.");
  }
  return value;
}
