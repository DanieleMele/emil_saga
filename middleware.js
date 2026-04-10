import { rewrite, next } from '@vercel/edge';

export const config = {
  matcher: '/',
};

export default function middleware(request) {
  const host = (request.headers.get('host') || '').toLowerCase();
  if (host === 'emilsaga.de' || host === 'www.emilsaga.de') {
    return rewrite(new URL('/index-de.html', request.url));
  }
  return next();
}
