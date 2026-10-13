type SecretNeedle = { name: string; value: string };

const serverSecretNames = [
  "SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE", "OPENAI_API_KEY", "OPENROUTER_API_KEY",
  "GOOGLE_CLIENT_SECRET", "GITHUB_CLIENT_SECRET", "SUPABASE_ACCESS_TOKEN",
];

/** Exact-value smoke check; it cannot establish absence of transformed or unknown secrets. */
export function configuredSecretNeedles(env: Record<string, string | undefined>): SecretNeedle[] {
  const needles: SecretNeedle[] = [];
  for (const name of serverSecretNames) {
    const value = env[name]?.trim();
    if (value && value.length >= 12) needles.push({ name, value });
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    const value = env[name];
    if (!value) continue;
    try {
      const url = new URL(value);
      const password = decodeURIComponent(url.password);
      if (password.length < 12) continue;
      for (const candidate of new Set([value, url.password, password])) needles.push({ name, value: candidate });
    } catch {
      // Configuration validation owns malformed URLs. Do not print their contents.
    }
  }
  return needles;
}

export function leakedSecretNames(text: string, needles: SecretNeedle[]): string[] {
  return [...new Set(needles.filter((needle) => text.includes(needle.value)).map((needle) => needle.name))];
}

export function redactConfiguredSecrets(text: string, needles: SecretNeedle[]): string {
  return [...needles].sort((a, b) => b.value.length - a.value.length)
    .reduce((result, needle) => result.split(needle.value).join("[REDACTED]"), text);
}
