import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
};

const STREAM_TYPES = new Set(['.mp4', '.webm', '.ogg']);

async function tryRead(filePath) {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

async function tryStat(filePath) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  let url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const candidates = [url];
  if (!extname(url)) candidates.push(url.replace(/\/$/, '') + '.html');

  for (const candidate of candidates) {
    const filePath = join(__dirname, candidate);
    const ext = extname(candidate).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    // Stream video files with range-request support
    if (STREAM_TYPES.has(ext)) {
      const fileStat = await tryStat(filePath);
      if (!fileStat) continue;
      const size = fileStat.size;
      const range = req.headers.range;

      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024 - 1, size - 1);
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': contentType,
        });
        createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': size,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
        });
        createReadStream(filePath).pipe(res);
      }
      return;
    }

    const data = await tryRead(filePath);
    if (data) {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
      return;
    }
  }
  res.writeHead(404);
  res.end('Not found');
}).listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
