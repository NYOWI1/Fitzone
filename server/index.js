const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const loadEnvFile = require("./config/env");
const { handleApiRequest } = require("./routes/api");

loadEnvFile();

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
const distPath = path.join(process.cwd(), "dist");

function serveStatic(request, response) {
  const requestedPath = request.url === "/" ? "/index.html" : request.url;
  const filePath = path.join(distPath, requestedPath);
  const normalizedPath = path.normalize(filePath);

  if (!normalizedPath.startsWith(distPath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(normalizedPath, (error, content) => {
    if (error) {
      const indexPath = path.join(distPath, "index.html");

      fs.readFile(indexPath, (indexError, indexContent) => {
        if (indexError) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }

        response.writeHead(200, { "Content-Type": "text/html" });
        response.end(indexContent);
      });
      return;
    }

    response.writeHead(200);
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  if (handleApiRequest(request, response)) {
    return;
  }

  serveStatic(request, response);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Set PORT to use a different port.`);
    process.exit(1);
  }

  console.error(`API server failed to start: ${error.message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`API server running at http://${host}:${port}`);
});
