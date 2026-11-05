import assert from 'node:assert/strict';

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!base || !publishableKey) {
  throw new Error('Supabase public environment variables are missing');
}

const url = new URL('/functions/v1/fitplan-register', base);
const allowedOrigins = [
  'https://sdy-fitplan.vercel.app',
  'https://fitplan-sdydy0298-dotcom.vercel.app'
];

for (const origin of allowedOrigins) {
  const preflight = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, x-client-info, apikey, content-type'
    },
    signal: AbortSignal.timeout(12000)
  });
  assert.equal(preflight.status, 200, `OPTIONS failed for ${origin}: HTTP ${preflight.status}`);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin,
    `CORS origin missing for ${origin}`);
  const methods = preflight.headers.get('access-control-allow-methods') || '';
  assert.ok(methods.toUpperCase().includes('POST'), `POST not allowed from ${origin}`);
  const headers = (preflight.headers.get('access-control-allow-headers') || '').toLowerCase();
  for (const header of ['authorization', 'apikey', 'content-type']) {
    assert.ok(headers.includes(header), `Missing ${header} CORS header for ${origin}`);
  }

  // Deliberately invalid address: verify the POST reaches input validation,
  // without creating a test user or consuming a registration rate-limit entry.
  const invalid = await fetch(url, {
    method: 'POST',
    headers: {
      Origin: origin,
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      action: 'register-v2',
      email: 'not-an-email',
      password: 'invalid-registration-input'
    }),
    signal: AbortSignal.timeout(12000)
  });
  assert.equal(invalid.headers.get('access-control-allow-origin'), origin,
    `POST is missing CORS header for ${origin}`);
  assert.equal(invalid.status, 400,
    `Expected input validation HTTP 400 but received HTTP ${invalid.status} from ${origin}`);
  const data = await invalid.json();
  assert.ok(typeof data.error === 'string' && data.error.length > 0,
    `No JSON validation error returned for ${origin}`);
  console.log(`PASS: Edge Function OPTIONS + validation POST from ${origin}`);
}
