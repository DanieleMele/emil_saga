import { list, put, del } from '@vercel/blob';

// Private endpoint — every request must carry the correct ADMIN_PASSWORD in
// the `x-admin-key` header. Without it, nothing is readable. Lets the author
// list all entries (incl. pending), approve / reject them, and draw a winner.

function authorized(req) {
  const key = req.headers['x-admin-key'];
  const pass = process.env.ADMIN_PASSWORD;
  return Boolean(pass) && key === pass;
}

async function readMeta(blob) {
  try {
    const r = await fetch(blob.url, { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

const metaPutOpts = {
  access: 'public',
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 0,
};

export default async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }

  try {
    const { blobs } = await list({ prefix: 'meta/' });

    if (req.method === 'GET') {
      const metas = (await Promise.all(blobs.map(readMeta)))
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.status(200).json({ entries: metas });
    }

    if (req.method === 'POST') {
      const { action, id } = req.body || {};
      if (!action) return res.status(400).json({ error: 'Aktion fehlt' });

      if (action === 'approve' || action === 'reject') {
        if (!id) return res.status(400).json({ error: 'ID fehlt' });
        const metaBlob = blobs.find((b) => b.pathname === `meta/${id}.json`);
        if (!metaBlob) return res.status(404).json({ error: 'Eintrag nicht gefunden' });
        const meta = await readMeta(metaBlob);
        if (!meta) return res.status(404).json({ error: 'Eintrag nicht lesbar' });

        if (action === 'reject') {
          await del(meta.photoUrl).catch(() => {});
          await del(metaBlob.url).catch(() => {});
          return res.status(200).json({ ok: true });
        }

        meta.status = 'approved';
        await put(`meta/${id}.json`, JSON.stringify(meta), metaPutOpts);
        return res.status(200).json({ ok: true });
      }

      if (action === 'draw') {
        const metas = (await Promise.all(blobs.map(readMeta))).filter(Boolean);
        const approved = metas.filter((m) => m.status === 'approved');
        if (!approved.length) {
          return res.status(400).json({ error: 'Keine freigegebenen Einsendungen vorhanden.' });
        }
        const winner = approved[Math.floor(Math.random() * approved.length)];
        await Promise.all(
          metas.map(async (m) => {
            const shouldWin = m.id === winner.id;
            if (Boolean(m.winner) !== shouldWin) {
              m.winner = shouldWin;
              await put(`meta/${m.id}.json`, JSON.stringify(m), metaPutOpts);
            }
          })
        );
        return res.status(200).json({
          ok: true,
          winner: { id: winner.id, name: winner.name, photoUrl: winner.photoUrl },
        });
      }

      if (action === 'clearWinner') {
        const metas = (await Promise.all(blobs.map(readMeta))).filter(Boolean);
        await Promise.all(
          metas
            .filter((m) => m.winner)
            .map(async (m) => {
              m.winner = false;
              await put(`meta/${m.id}.json`, JSON.stringify(m), metaPutOpts);
            })
        );
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Unbekannte Aktion' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin error:', err);
    return res.status(500).json({ error: 'Serverfehler' });
  }
}
