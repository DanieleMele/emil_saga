import { rewrite, next } from '@vercel/edge';

export const config = {
  matcher: ['/', '/leseprobe', '/support'],
};

export default function middleware(request) {
  const host = (request.headers.get('host') || '').toLowerCase();
  const isDe = host === 'emilsaga.de' || host === 'www.emilsaga.de';
  if (!isDe) return next();

  const url = new URL(request.url);
  if (url.pathname === '/') {
    return rewrite(new URL('/index-de.html', request.url));
  }
  if (url.pathname === '/leseprobe') {
    return rewrite(new URL('/leseprobe-de.html', request.url));
  }
  if (url.pathname === '/support') {
    return rewrite(new URL('/support-de.html', request.url));
  }
  return next();
}
