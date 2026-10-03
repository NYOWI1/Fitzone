const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { authenticateApiRequest, checkApiRateLimit } = require('../src/security/auth');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig' };
const originalFetch = global.fetch;
const originalSecret = process.env.CLERK_SECRET_KEY;
let currentRole = 'member';

function makeToken(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: 'user_test', sid: 'sess_test', iss: 'https://clerk.example.com',
    azp: 'https://fitzone.example.com', iat: now, nbf: now, exp: now + 60,
    ...overrides,
  })).toString('base64url');
  const content = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(content), privateKey).toString('base64url');
  return `${content}.${signature}`;
}

function makeResponse() {
  return {
    status: null,
    setHeader() {},
    writeHead(status) { this.status = status; },
    end() {},
  };
}

test.before(() => {
  process.env.CLERK_SECRET_KEY = 'sk_test_fake';
  global.fetch = async (url) => {
    if (url.endsWith('/v1/jwks')) return { ok: true, json: async () => ({ keys: [jwk] }) };
    if (url.endsWith('/v1/users/user_test')) return {
      ok: true,
      json: async () => ({
        id: 'user_test', primary_email_address_id: 'email_test',
        email_addresses: [{ id: 'email_test', email_address: 'member@example.com' }],
        public_metadata: { role: currentRole },
      }),
    };
    throw new Error(`Unexpected request: ${url}`);
  };
});

test.after(() => {
  global.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.CLERK_SECRET_KEY;
  else process.env.CLERK_SECRET_KEY = originalSecret;
});

test('public schedule is available without a session', async () => {
  const request = { url: '/api/class-schedule', method: 'GET', headers: {} };
  assert.equal(await authenticateApiRequest(request, makeResponse(), []), true);
});

test('private member data requires a session', async () => {
  const response = makeResponse();
  const request = { url: '/api/member-payments', method: 'GET', headers: {} };
  assert.equal(await authenticateApiRequest(request, response, []), false);
  assert.equal(response.status, 401);
});

test('signed-in members cannot call admin endpoints', async () => {
  const response = makeResponse();
  const request = {
    url: '/api/members', method: 'GET',
    headers: { authorization: `Bearer ${makeToken()}` },
  };
  assert.equal(await authenticateApiRequest(request, response, ['https://fitzone.example.com']), false);
  assert.equal(response.status, 403);
});

test('verified sessions provide the server-side member identity', async () => {
  const request = {
    url: '/api/member-payments?email=someone-else@example.com', method: 'GET',
    headers: { authorization: `Bearer ${makeToken()}` },
  };
  assert.equal(await authenticateApiRequest(request, makeResponse(), ['https://fitzone.example.com']), true);
  assert.equal(request.auth.email, 'member@example.com');
  assert.equal(request.auth.userId, 'user_test');
});

test('admin role is checked using Clerk user metadata', async () => {
  currentRole = 'admin';
  const request = { url: '/api/members', method: 'GET', headers: { authorization: `Bearer ${makeToken()}` } };
  assert.equal(await authenticateApiRequest(request, makeResponse(), ['https://fitzone.example.com']), true);
  assert.equal(request.auth.isAdmin, true);
  currentRole = 'member';
});

test('tampered signatures are rejected', async () => {
  const token = makeToken();
  const request = { url: '/api/member-payments', method: 'GET', headers: { authorization: `Bearer ${token.slice(0, -3)}abc` } };
  const response = makeResponse();
  assert.equal(await authenticateApiRequest(request, response, ['https://fitzone.example.com']), false);
  assert.equal(response.status, 401);
});

test('billing writes are rate limited per member', () => {
  const request = { url: '/api/stripe/subscriptions', method: 'POST', auth: { userId: 'user_limit_test' } };
  for (let index = 0; index < 10; index += 1) assert.equal(checkApiRateLimit(request, makeResponse()), true);
  const response = makeResponse();
  assert.equal(checkApiRateLimit(request, response), false);
  assert.equal(response.status, 429);
});

test('expired or wrong-origin sessions are rejected', async () => {
  for (const token of [makeToken({ exp: 1 }), makeToken({ azp: 'https://other.example.com' })]) {
    const response = makeResponse();
    const request = { url: '/api/member-payments', method: 'GET', headers: { authorization: `Bearer ${token}` } };
    assert.equal(await authenticateApiRequest(request, response, ['https://fitzone.example.com']), false);
    assert.equal(response.status, 401);
  }
});
