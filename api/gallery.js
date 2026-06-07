import { list } from '@vercel/blob';

function blobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find((k) => k.endsWith('READ_WRITE_TOKEN'));
  return key ? process.env[key] : undefined;
}

// Public endpoint: returns only APPROVED entries for the gallery wall.
// Pending / rejected entries are never exposed here.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { blobs } = await list({ prefix: 'meta/', token: blobToken() });

    const metas = await Promise.all(
      blobs.map(async (b) => {
        try {
          const r = await fetch(b.url, { cache: 'no-store' });
          return r.ok ? await r.json() : null;
        } catch {
          return null;
        }
      })
    );

    const entries = metas
      .filter((m) => m && m.status === 'approved')
      .sort(
        (a, b) =>
          (b.winner ? 1 : 0) - (a.winner ? 1 : 0) ||
          new Date(b.createdAt) - new Date(a.createdAt)
      )
      .map((m) => ({ name: m.name, photoUrl: m.photoUrl, winner: !!m.winner }));

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ entries });
  } catch (err) {
    console.error('gallery error:', err);
    return res.status(500).json({ error: 'Serverfehler', detail: String((err && err.message) || err) });
  }
}
