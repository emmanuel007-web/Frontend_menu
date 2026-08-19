import { HttpInterceptorFn } from '@angular/common/http';

/**
 * CSRF con doble envío (cookie XSRF-TOKEN + header X-XSRF-TOKEN) para
 * peticiones mutantes. Se lee la cookie directamente (funciona entre
 * orígenes: el frontend corre en otro puerto que la API).
 */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next(req);
  }
  const token = readCookie('XSRF-TOKEN');
  if (!token) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-XSRF-TOKEN': token } }));
};

function readCookie(name: string): string | null {
  const match = document.cookie.match(`(?:^|;\\s*)${name}=([^;]*)`);
  return match ? decodeURIComponent(match[1]) : null;
}
