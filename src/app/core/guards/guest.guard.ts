import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Solo visitantes (no autenticados). Verifica la sesión por cookies antes
 * de dejar pasar: si hay sesión activa, redirige al panel.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return auth.restoreSession().pipe(
      map((user) => (user != null ? router.createUrlTree(['/admin']) : true)),
      catchError(() => of(true)),
    );
  }
  return router.createUrlTree(['/admin']);
};