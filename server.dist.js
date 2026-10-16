/* eslint-disable no-console */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const https = require("https");
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const HOST = "localhost";
const PORT = process.env.PORT || 9002;

// Change this if your webpack.prod.js outputs somewhere else.
const DIST_DIR = path.join(__dirname, "/web-server/dist");

// HTTPS cert/key files.
// Generate these locally for testing, or point to existing certs.
const SSL_KEY = process.env.SSL_KEY || path.join(__dirname, "certs", "localhost-key.pem");
const SSL_CERT = process.env.SSL_CERT || path.join(__dirname, "certs", "localhost-cert.pem");

// Match webpack-dev-server proxy behavior:
//
// proxy: [
//   {
//     context: ["/api"],
//     target: "https://haproxy:443",
//     pathRewrite: { "^/api": "" },
//     secure: false,
//   },
// ],
app.use(
  "/api",
  createProxyMiddleware({
    target: process.env.API_TARGET || "https://localhost:443",
    changeOrigin: true,
    secure: false,
    pathRewrite: {
      "^/api": "",
    },
    logLevel: "debug",
  })
);

// Serve static files from dist at publicPath "/"
app.use(
  express.static(DIST_DIR, {
    index: "slycat_projects.html",
  })
);

// Match webpack-dev-server historyApiFallback rewrites:
//
// { from: /^\/projects\//, to: "/slycat_project.html" },
// { from: /^\/projects/, to: "/slycat_projects.html" },
// { from: /^\/models/, to: "/slycat_model.html" },
// { from: /^\/login/, to: "/slycat_login.html" },
// { from: /^\/pages/, to: "/slycat_page.html" },
function sendDistFile(res, filename) {
  res.sendFile(path.join(DIST_DIR, filename));
}

app.get(/^\/projects\//, (req, res) => {
  sendDistFile(res, "slycat_project.html");
});

app.get(/^\/projects/, (req, res) => {
  sendDistFile(res, "slycat_projects.html");
});

app.get(/^\/models/, (req, res) => {
  sendDistFile(res, "slycat_model.html");
});

app.get(/^\/login/, (req, res) => {
  sendDistFile(res, "slycat_login.html");
});

app.get(/^\/pages/, (req, res) => {
  sendDistFile(res, "slycat_page.html");
});

// Optional root fallback.
// This mirrors devMiddleware.index = "slycat_projects.html".
app.get("/", (req, res) => {
  sendDistFile(res, "slycat_projects.html");
});

// Optional final fallback.
// You can remove this if you want unknown routes to 404.
app.get(/.*/, (req, res) => {
  sendDistFile(res, "slycat_projects.html");
});

const httpsOptions = {
  key: fs.readFileSync(SSL_KEY),
  cert: fs.readFileSync(SSL_CERT),
};

https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
  console.log(`Serving dist from: ${DIST_DIR}`);
  console.log(`Server running at https://${HOST}:${PORT}`);
  console.log(`API proxy target: ${process.env.API_TARGET || "https://localhost:443"}`);
});