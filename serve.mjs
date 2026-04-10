import { createServer } from 'http';
import { readFile } from 'fs/promises';
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
};

async function tryRead(filePath) {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  let url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const candidates = [url];
  if (!extname(url)) candidates.push(url.replace(/\/$/, '') + '.html');

  for (const candidate of candidates) {
    const data = await tryRead(join(__dirname, candidate));
    if (data) {
      const ext = extname(candidate).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
      return;
    }
  }
  res.writeHead(404);
  res.end('Not found');
}).listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
