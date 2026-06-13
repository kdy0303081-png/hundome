const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 8021;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.mp4': 'video/mp4'
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, safePath === '/' ? 'index.html' : safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const range = req.headers.range;

    if (ext === '.mp4' && range) {
      const [startText, endText] = range.replace('bytes=', '').split('-');
      const start = Number.parseInt(startText, 10);
      const end = endText ? Number.parseInt(endText, 10) : stats.size - 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4'
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Length': stats.size,
      'Accept-Ranges': ext === '.mp4' ? 'bytes' : 'none',
      'Content-Type': types[ext] || 'application/octet-stream'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  });
}).listen(port, '127.0.0.1');
