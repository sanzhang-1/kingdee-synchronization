const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/prod-api', // 匹配以/prod-api开头的请求
    createProxyMiddleware({
      target: 'http://127.0.0.1:8085', // 替换为实际的Java后端地址
      changeOrigin: true, // 开启跨域
      pathRewrite: {
        '^/prod-api': '/prod-api' // 保持路径不变（如果Java接口路径就是/prod-api/submit）
      }
    })
  );
};