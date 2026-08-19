import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshing$: Observable<boolean> | null = null;

/**
 * Traduce errores HTTP a mensajes legibles y en 401 renueva la sesión
 * (single-flight: todas las peticiones concurrentes esperan el MISMO
 * refresh) y reintenta la petición original una vez. Si el refresh falla,
 * expulsa al usuario a /login.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
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

      if (error.status === 401 && !req.url.includes('/auth/')) {
        const auth = inject(AuthService);
        return refreshOnce(auth).pipe(
          switchMap((ok) => {
            if (!ok) {
              auth.redirectToLogin();
              return throwError(() => normalized);
            }
            return next(req);
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