import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshing$: Observable<boolean> | null = null;

/** Marca las peticiones ya reintentadas tras un refresh: evita loops infinitos
 *  si el backend vuelve a responder 401 tras la renovación. */
const RETRIED = new HttpContextToken<boolean>(() => false);

/**
 * Traduce errores HTTP a mensajes legibles y en 401 renueva la sesión
 * (single-flight: todas las peticiones concurrentes esperan el MISMO
 * refresh) y reintenta la petición original UNA vez. Si el refresh falla
 * o el reintento vuelve a fallar, expulsa al usuario a /login.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Ocurrió un error inesperado';

      if (error.error && typeof error.error === 'object' && error.error.message) {
        message = error.error.message;
      } else if (error.status === 0) {
        message = 'No se pudo conectar con el servidor';
      }

      const normalized = new HttpErrorResponse({
        error: { ...(error.error ?? {}), message },
        status: error.status,
        statusText: error.statusText,
        url: error.url ?? undefined,
      });

      // Endpoints de autenticación directa no intentan renovar sesión
      const isAuthEndpoint =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/register') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/csrf');

      if (error.status === 401 && !isAuthEndpoint && !req.context.get(RETRIED)) {
        return refreshOnce(auth).pipe(
          switchMap((ok) => {
            if (!ok) {
              auth.clearSession();
              if (!req.url.includes('/auth/me')) {
                auth.redirectToLogin();
              }
              return throwError(() => normalized);
            }
            return next(req.clone({ context: req.context.set(RETRIED, true) }));
          }),
        );
      }

      return throwError(() => normalized);
    }),
  );
};

function refreshOnce(auth: AuthService): Observable<boolean> {
  if (!refreshing$) {
    refreshing$ = auth.refresh().pipe(
      map((user) => user != null),
      catchError(() => of(false)),
      finalize(() => (refreshing$ = null)),
    );
  }
  return refreshing$;
}