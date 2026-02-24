export function assertEnvPresent(keys: string[], context: string): void {
  const missing = keys.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(`[env:${context}] Missing required environment variables: ${missing.join(', ')}`);
  }
}
