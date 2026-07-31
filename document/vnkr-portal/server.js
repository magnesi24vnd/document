/**
 * VNKR Portal — Static file server
 * Chạy: node server.js
 * Địa chỉ: http://localhost:3334
 */

"use strict";

const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT    = 3334;
const ROOT    = __dirname;

const MIME = {
  ".html" : "text/html; charset=utf-8",
  ".css"  : "text/css; charset=utf-8",
  ".js"   : "application/javascript; charset=utf-8",
  ".json" : "application/json; charset=utf-8",
  ".svg"  : "image/svg+xml",
  ".png"  : "image/png",
  ".jpg"  : "image/jpeg",
  ".jpeg" : "image/jpeg",
  ".gif"  : "image/gif",
  ".ico"  : "image/x-icon",
  ".webp" : "image/webp",
  ".woff" : "font/woff",
  ".woff2": "font/woff2",
  ".ttf"  : "font/ttf",
  ".pdf"  : "application/pdf",
};

const BLOCKED = ["/node_modules/", "/tests/", "/."];

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0]; // strip query string

  // ── Block protected paths ──────────────────────────────────────────────
  if (BLOCKED.some((b) => url.startsWith(b) || url.includes(b))) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("403 Forbidden");
  }

  // ── Resolve file path ──────────────────────────────────────────────────
  let filePath = path.join(ROOT, url === "/" ? "index.html" : url);

  // Append .html if no extension (SPA-style clean URLs)
  if (!path.extname(filePath)) filePath += ".html";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Try directory index
      const indexPath = path.join(filePath.replace(/\.html$/, ""), "index.html");
      fs.readFile(indexPath, (err2, data2) => {
        if (err2) {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
          return res.end(`<!DOCTYPE html><html><body><h2>404 — Không tìm thấy trang</h2><p><a href="/">← Về trang chủ</a></p></body></html>`);
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data2);
      });
      return;
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ VNKR Portal đang chạy tại http://0.0.0.0:${PORT}`);
  console.log(`   Root: ${ROOT}`);
  console.log(`   Nhấn Ctrl+C để dừng.`);
});
