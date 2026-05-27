const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "public");
const port = Number(process.env.PORT || 3000);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  const requested = decodeURIComponent(req.url.split("?")[0]);
  const safePath = requested === "/" ? "/index.html" : requested;
  const filePath = path.normalize(path.join(root, safePath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Acesso negado");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(root, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Arquivo nao encontrado");
          return;
        }
        res.writeHead(200, { "Content-Type": types[".html"] });
        res.end(fallback);
      });
      return;
    }

    const extension = path.extname(filePath);
    res.writeHead(200, { "Content-Type": types[extension] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Sistema de pedidos rodando em http://localhost:${port}`);
});
