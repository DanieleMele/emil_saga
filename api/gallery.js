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
    const token = blobToken();

    // O(1): read the single aggregated index the admin maintains on approve.
    // (Per-entry meta files remain the source of truth for safe parallel writes.)
    const { blobs } = await list({ prefix: 'index/approved.json', token });
    let entries = [];
    if (blobs.length) {
      const r = await fetch(`${blobs[0].url}?ts=${Date.now()}`, { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        entries = (Array.isArray(data) ? data : []).map((m) => ({
          name: m.name,
          photoUrl: m.photoUrl,
          winner: !!m.winner,
        }));
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=20');
    return res.status(200).json({ entries });
  } catch (err) {
    console.error('gallery error:', err);
    return res.status(500).json({ error: 'Serverfehler' });
  }
}
