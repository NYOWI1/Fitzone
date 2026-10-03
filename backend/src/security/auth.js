const crypto = require('node:crypto');

const PUBLIC_GET_PATHS = new Set([
  '/api/health',
  '/api/membership-plans',
  '/api/trainers',
  '/api/class-schedule',
  '/api/class-booking-counts',
  '/api/site-settings',
  '/api/crowd-status',
]);
const ADMIN_PATHS = new Set([
  '/api/members',
  '/api/members/attendance',
  '/api/admin/membership-plans',
  '/api/stripe/payments',
  '/api/stripe/revenue-overview',
  '/api/admin/trainers',
  '/api/admin/trainer-bookings',
]);
const ADMIN_WRITE_PATHS = new Set([
  '/api/membership-plans',
  '/api/trainers',
  '/api/class-schedule/classes',
  '/api/site-settings',
  '/api/crowd-status',
]);
let jwksCache = { keys: [], expiresAt: 0 };
const requestWindows = new Map();

function sendAuthError(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ message }));
}

function decodePart(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

async function getJwks(secretKey, refresh = false) {
  if (!refresh && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const response = await fetch('https://api.clerk.com/v1/jwks', {
    headers: { Authorization: `Bearer ${secretKey}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Clerk JWKS request failed');
  const data = await response.json();
  if (!Array.isArray(data.keys)) throw new Error('Invalid Clerk JWKS');
  jwksCache = { keys: data.keys, expiresAt: Date.now() + 10 * 60_000 };
  return data.keys;
}

async function verifyClerkToken(token, secretKey, allowedOrigins) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid session token');
  const header = decodePart(parts[0]);
  const claims = decodePart(parts[1]);
  if (header.alg !== 'RS256' || !header.kid || header.typ && header.typ !== 'JWT') {
    throw new Error('Unsupported session token');
  }
  let keys = await getJwks(secretKey);
  let key = keys.find((item) => item.kid === header.kid && item.kty === 'RSA');
  if (!key) {
    keys = await getJwks(secretKey, true);
    key = keys.find((item) => item.kid === header.kid && item.kty === 'RSA');
  }
  if (!key || key.use && key.use !== 'sig') throw new Error('Unknown session key');
  const publicKey = crypto.createPublicKey({ key, format: 'jwk' });
  const valid = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, Buffer.from(parts[2], 'base64url'));
  const now = Math.floor(Date.now() / 1000);
  if (!valid || !Number.isFinite(claims.exp) || claims.exp <= now ||
      !Number.isFinite(claims.nbf) || claims.nbf > now + 5 ||
      !Number.isFinite(claims.iat) || claims.iat > now + 5 ||
      typeof claims.sub !== 'string' || !claims.sub.startsWith('user_') ||
      typeof claims.sid !== 'string' || !claims.sid.startsWith('sess_') ||
      typeof claims.iss !== 'string' || !claims.iss.startsWith('https://')) {
    throw new Error('Invalid session token');
  }
  if (allowedOrigins.length && (!claims.azp || !allowedOrigins.includes(claims.azp))) {
    throw new Error('Unrecognized session origin');
  }
  return claims;
}

function getPrimaryEmail(user) {
  const address = (user.email_addresses || []).find((item) => item.id === user.primary_email_address_id) || user.email_addresses?.[0];
  return String(address?.email_address || '').trim().toLowerCase();
}

function isAdmin(user) {
  const metadata = user.public_metadata || {};
  return metadata.isAdmin === true || metadata.role === 'admin' ||
    (Array.isArray(metadata.role) && metadata.role.includes('admin')) ||
    (Array.isArray(metadata.roles) && metadata.roles.includes('admin'));
}

async function authenticateApiRequest(request, response, allowedOrigins) {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (!path.startsWith('/api/') || request.method === 'GET' && PUBLIC_GET_PATHS.has(path)) return true;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    sendAuthError(response, 503, 'Authentication is not configured.');
    return false;
  }
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(String(request.headers.authorization || ''));
  if (!match) {
    sendAuthError(response, 401, 'Sign in to continue.');
    return false;
  }
  try {
    const claims = await verifyClerkToken(match[1], secretKey, allowedOrigins);
    const userResponse = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(claims.sub)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!userResponse.ok) throw new Error('Unable to verify user');
    const user = await userResponse.json();
    const email = getPrimaryEmail(user);
    if (!email || user.id !== claims.sub || user.banned || user.locked) throw new Error('Inactive account');
    request.auth = {
      userId: claims.sub,
      email,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || email,
      isAdmin: isAdmin(user),
    };
    if (!request.auth.isAdmin && (ADMIN_PATHS.has(path) || request.method !== 'GET' && ADMIN_WRITE_PATHS.has(path))) {
      sendAuthError(response, 403, 'Administrator access is required.');
      return false;
    }
    return true;
  } catch (error) {
    sendAuthError(response, 401, 'Your session could not be verified. Please sign in again.');
    return false;
  }
}

function checkApiRateLimit(request, response) {
  if (!request.auth) return true;
  const path = new URL(request.url, 'http://localhost').pathname;
  const billingWrite = request.method === 'POST' && [
    '/api/stripe/payment-intents', '/api/stripe/subscriptions', '/api/stripe/billing-portal',
  ].includes(path);
  const key = `${request.auth.userId}:${billingWrite ? 'billing' : 'api'}`;
  const now = Date.now();
  const window = requestWindows.get(key);
  const count = window && now - window.startedAt < 60_000 ? window.count + 1 : 1;
  requestWindows.set(key, {
    startedAt: window && now - window.startedAt < 60_000 ? window.startedAt : now,
    count,
  });
  if (requestWindows.size > 10_000) {
    for (const [entryKey, entry] of requestWindows) {
      if (now - entry.startedAt >= 60_000) requestWindows.delete(entryKey);
    }
  }
  if (count > (billingWrite ? 10 : 240)) {
    response.setHeader('Retry-After', '60');
    sendAuthError(response, 429, 'Too many requests. Please try again shortly.');
    return false;
  }
  return true;
}

module.exports = { authenticateApiRequest, checkApiRateLimit };
