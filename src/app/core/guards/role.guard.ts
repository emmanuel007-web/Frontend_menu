import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Restringe el acceso a rutas según los roles autorizados.
 * Ejemplo de uso en rutas: `canActivate: [roleGuard('SUPER_ADMIN')]`
 */
export const roleGuard = (...allowedRoles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const checkRole = (role?: string) => {
      if (role && allowedRoles.includes(role)) {
        return true;
      }
      return router.createUrlTree(['/admin/dashboard']);
    };

    if (auth.isAuthenticated()) {
      return checkRole(auth.user()?.role);
    }

    return auth.restoreSession().pipe(
      map((user) => (user != null ? checkRole(user.role) : router.createUrlTree(['/login']))),
      catchError(() => of(router.createUrlTree(['/login']))),
    );
  };
};
