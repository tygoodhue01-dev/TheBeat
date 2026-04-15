/**
 * Dev-only: proxy API and uploads to the FastAPI server so the app can use same-origin `/api`.
 * Override port: REACT_APP_PROXY_TARGET=http://127.0.0.1:YOUR_PORT
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function proxyToBackend(app) {
  const target = process.env.REACT_APP_PROXY_TARGET || 'http://127.0.0.1:8001';
  app.use(
    ['/api', '/uploads'],
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};
