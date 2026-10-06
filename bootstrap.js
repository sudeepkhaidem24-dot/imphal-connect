// Imphal Connect production enhancement loader.
// Loaded before server.js via Node --import so the existing backend stays intact.
const expressModule = await import('express');
const express = expressModule.default;
const originalStatic = express.static;

express.static = function patchedStatic(root, options) {
  const middleware = originalStatic(root, options);
  return function enhancedStatic(req, res, next) {
    if (req.method !== 'GET' || !/^\/(?:index\.html)?$/.test(req.path || req.url.split('?')[0])) {
      return middleware(req, res, next);
    }

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const chunks = [];
    let captured = true;

    res.write = function write(chunk, encoding) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      return true;
    };

    res.end = function end(chunk, encoding, callback) {
      if (!captured) return originalEnd(chunk, encoding, callback);
      captured = false;
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      res.write = originalWrite;
      res.end = originalEnd;

      const body = Buffer.concat(chunks);
      const contentType = String(res.getHeader('content-type') || '');
      if (contentType.includes('text/html')) {
        const html = body.toString('utf8');
        const tag = '<script defer src="/upgrade.js?build=20261006-16"></script><script defer src="/production.js?build=20261006-1"></script><script defer src="/production-fix.js?build=20261006-2"></script>';
        const upgraded = html.includes('/production.js') ? html : html.replace(/<\/body>/i, tag + '</body>');
        res.setHeader('content-length', Buffer.byteLength(upgraded));
        return originalEnd(Buffer.from(upgraded), undefined, callback);
      }
      return originalEnd(body, undefined, callback);
    };

    return middleware(req, res, next);
  };
};
