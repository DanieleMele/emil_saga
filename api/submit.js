import { put } from '@vercel/blob';

// Submission deadline (Einsendeschluss): end of 31 August 2026, Swiss time.
const DEADLINE = new Date('2026-08-31T23:59:59+02:00');

// Public endpoint: a reader submits a photo (compressed client-side to a
// data URL) plus the name they want shown. Stored to Vercel Blob with
// status "pending" — nothing is shown publicly until the author approves it.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (Date.now() > DEADLINE.getTime()) {
    return res.status(403).json({ error: 'Die Einsendephase ist beendet (Einsendeschluss: 31. August 2026).' });
  }

  try {
    const { name, image, consent } = req.body || {};

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
      return res.status(400).json({ error: 'Bitte gib einen gültigen Namen an (2–60 Zeichen).' });
    }
    if (consent !== true) {
      return res.status(400).json({ error: 'Bitte bestätige die Einwilligung zur Veröffentlichung.' });
    }
    if (typeof image !== 'string') {
      return res.status(400).json({ error: 'Bitte lade ein Foto hoch.' });
    }

    const match = image.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Ungültiges Bildformat. Erlaubt: JPG, PNG, WebP.' });
    }
    const mime = match[1];
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const buffer = Buffer.from(match[3], 'base64');

    if (buffer.length < 1024) {
      return res.status(400).json({ error: 'Das Bild ist beschädigt oder leer.' });
    }
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(413).json({ error: 'Das Bild ist zu gross (max. 4 MB).' });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const photo = await put(`entries/${id}.${ext}`, buffer, {
      access: 'public',
      contentType: mime,
      addRandomSuffix: false,
    });

    const meta = {
      id,
      name: name.trim().slice(0, 60),
      photoUrl: photo.url,
      status: 'pending',
      winner: false,
      createdAt: new Date().toISOString(),
    };

    await put(`meta/${id}.json`, JSON.stringify(meta), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit error:', err);
    return res.status(500).json({ error: 'Serverfehler. Bitte versuche es später erneut.', detail: String((err && err.message) || err) });
  }
}
