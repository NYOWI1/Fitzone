const http = require('node:http');
const loadEnvFile = require('./config/env');
const { warmMongoConnection } = require('./config/db');
const { handleApiRequest } = require('./routes/api');
const { authenticateApiRequest, checkApiRateLimit } = require('./security/auth');

loadEnvFile();

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';
const allowedOrigins = String(process.env.CORS_ORIGINS || 'https://fitzone-frontend-wheat.vercel.app,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

function setCorsHeaders(request, response) {
  const origin = String(request.headers.origin || '').replace(/\/$/, '');
  const allowOrigin = allowedOrigins.includes(origin);

  if (allowOrigin) {
    response.setHeader('Access-Control-Allow-Origin', origin || '*');
    response.setHeader('Vary', 'Origin');
  }

  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Strict-Transport-Security', 'max-age=31536000');
}

const server = http.createServer(async (request, response) => {
  const requestStartedAt = Date.now();

  setCorsHeaders(request, response);

  if (request.method === 'OPTIONS' && request.url?.startsWith('/api/')) {
    response.writeHead(204);
    response.end();
    return;
  }

  response.setTimeout(10000, () => {
    if (!response.headersSent) {
      response.writeHead(504, { 'Content-Type': 'application/json' });
    }

    response.end(
      JSON.stringify({
        message: 'Request timed out. Check the API server connection.'
      })
    );
  });

  response.on('finish', () => {
    if (request.url?.startsWith('/api/')) {
      console.log(
        `${request.method} ${new URL(request.url, 'http://localhost').pathname} ${response.statusCode} ${Date.now() - requestStartedAt}ms`
      );
    }
  });

  if (!(await authenticateApiRequest(request, response, allowedOrigins))) {
    return;
  }
  if (!checkApiRateLimit(request, response)) return;
  if (request.auth) response.setHeader('Cache-Control', 'no-store');

  if (handleApiRequest(request, response)) {
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ message: 'Not found.' }));
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} is already in use. Set PORT to use a different port.`
    );
    process.exit(1);
  }

  console.error(`API server failed to start: ${error.message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`API server running at http://${host}:${port}`);
  warmMongoConnection();
});
