// Local preview of dist/: `node serve.mjs` then open http://localhost:8080
// Mirrors static hosts: /jobs/ serves /jobs/index.html, unknown paths get 404.html.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT || 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
};

if (!fs.existsSync(root)) { console.error("No dist/ folder. Run: node build.mjs"); process.exit(1); }

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!p.endsWith("/")) { res.writeHead(301, { Location: p + "/" }).end(); return; }
    file = path.join(file, "index.html");
  }
  let status = 200;
  if (!fs.existsSync(file)) { status = 404; file = path.join(root, "404.html"); }
  res.writeHead(status, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`Avenrix preview: http://localhost:${port}`));
