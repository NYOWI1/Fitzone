const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadEnvFile = require('./config/env');
const { warmMongoConnection } = require('./config/db');
const { handleApiRequest } = require('./routes/api');

loadEnvFile();

const port = Number(process.env.PORT || 3001);
const shouldShowNetworkUrl = process.argv.includes('--host');
const host =
  process.env.HOST || (shouldShowNetworkUrl ? '0.0.0.0' : '127.0.0.1');
const isApiOnly = process.env.FITZONE_API_ONLY === 'true';
const distPath = path.join(process.cwd(), 'dist');

const contentTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.onnx': 'application/octet-stream',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp'
};

function getContentType(filePath) {
  return (
    contentTypes[path.extname(filePath).toLowerCase()] ||
    'application/octet-stream'
  );
}

function getRequestedPath(requestUrl) {
  try {
    const { pathname } = new URL(requestUrl, 'http://localhost');
    return pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  } catch {
    return '/index.html';
  }
}

function serveStatic(request, response) {
  const requestedPath = getRequestedPath(request.url);
  const filePath = path.join(distPath, requestedPath);
  const normalizedPath = path.normalize(filePath);

  if (!normalizedPath.startsWith(distPath)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(normalizedPath, (error, content) => {
    if (error) {
      const indexPath = path.join(distPath, 'index.html');

      fs.readFile(indexPath, (indexError, indexContent) => {
        if (indexError) {
          response.writeHead(404);
          response.end('Not found');
          return;
        }

        response.writeHead(200, { 'Content-Type': getContentType(indexPath) });
        response.end(indexContent);
      });
      return;
    }

    response.writeHead(200, { 'Content-Type': getContentType(normalizedPath) });
    response.end(content);
  });
}

function getNetworkUrls() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(
      (networkInterface) =>
        networkInterface &&
        networkInterface.family === 'IPv4' &&
        !networkInterface.internal
    )
    .map((networkInterface) => `http://${networkInterface.address}:${port}/`);
}

const server = http.createServer((request, response) => {
  const requestStartedAt = Date.now();

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
        `${request.method} ${request.url} ${response.statusCode} ${Date.now() - requestStartedAt}ms`
      );
    }
  });

  if (handleApiRequest(request, response)) {
    return;
  }

  serveStatic(request, response);
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

  if (!isApiOnly) {
    console.log(`Page: http://localhost:${port}/`);
  }

  if (shouldShowNetworkUrl && !isApiOnly) {
    getNetworkUrls().forEach((networkUrl) => {
      console.log(`Network: ${networkUrl}`);
    });
  }

  warmMongoConnection();
});
