import { list, put, del } from '@vercel/blob';

// Private endpoint — every request must carry the correct ADMIN_PASSWORD in
// the `x-admin-key` header. Without it, nothing is readable. Lets the author
// list all entries (incl. pending), approve / reject them, and draw a winner.

function authorized(req) {
  const key = req.headers['x-admin-key'];
  const pass = process.env.ADMIN_PASSWORD;
  return Boolean(pass) && key === pass;
}

function blobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find((k) => k.endsWith('READ_WRITE_TOKEN'));
  return key ? process.env[key] : undefined;
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
  token: blobToken(),
};

export default async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }

  try {
    const { blobs } = await list({ prefix: 'meta/', token: blobToken() });

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
          await del(meta.photoUrl, { token: blobToken() }).catch(() => {});
          await del(metaBlob.url, { token: blobToken() }).catch(() => {});
          return res.status(200).json({ ok: true });
        }

        meta.status = 'approved';
        await put(`meta/${id}.json`, JSON.stringify(meta), metaPutOpts);
        return res.status(200).json({ ok: true });
      }

      if (action === 'setWinner' || action === 'unsetWinner') {
        if (!id) return res.status(400).json({ error: 'ID fehlt' });
        const metas = (await Promise.all(blobs.map(readMeta))).filter(Boolean);
        const target = metas.find((m) => m.id === id);
        if (!target) return res.status(404).json({ error: 'Eintrag nicht gefunden' });
        if (action === 'setWinner' && target.status !== 'approved') {
          return res.status(400).json({ error: 'Nur freigegebene Einsendungen können gewinnen.' });
        }
        await Promise.all(
          metas.map(async (m) => {
            // setWinner: this entry becomes the sole winner; unsetWinner: only this one is cleared.
            const desired = action === 'setWinner' ? m.id === id : m.id === id ? false : Boolean(m.winner);
            if (Boolean(m.winner) !== desired) {
              m.winner = desired;
              await put(`meta/${m.id}.json`, JSON.stringify(m), metaPutOpts);
            }
          })
        );
        return res.status(200).json({ ok: true });
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
    return res.status(500).json({ error: 'Serverfehler', detail: String((err && err.message) || err) });
  }
}
