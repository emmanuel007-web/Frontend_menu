import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Traduce errores HTTP a mensajes legibles y expulsa al usuario en 401/403.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

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

      if (error.status === 401) {
        const authPath = req.url.includes('/auth/');
        if (!authPath) {
          localStorage.removeItem('menu_saas_access');
          localStorage.removeItem('menu_saas_refresh');
          localStorage.removeItem('menu_saas_user');
          router.navigate(['/login']);
        }
      }

      return throwError(() => normalized);
    }),
  );
};