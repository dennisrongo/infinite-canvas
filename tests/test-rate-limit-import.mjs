// Test if rate-limit module can be imported
try {
  const { checkRateLimit, getIdentifier, rateLimitConfigs } = await import('../src/lib/rate-limit.ts');
  console.log('Rate limit module imported successfully');
  console.log('rateLimitConfigs:', JSON.stringify(rateLimitConfigs));

  const identifier = getIdentifier({ headers: { get: () => '127.0.0.1' } });
  console.log('Identifier:', identifier);

  const result = checkRateLimit(identifier, 'test');
  console.log('Rate limit result:', result);
} catch (e) {
  console.log('Error importing rate-limit:', e.message);
  console.log('Stack:', e.stack);
}
