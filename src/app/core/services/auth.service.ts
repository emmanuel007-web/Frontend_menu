import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap, timeout } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthResponse, TokenUser } from '../models/models';

/**
 * Estado de autenticación basado en signals, SIN tokens en localStorage:
 * los JWT viven en cookies HttpOnly gestionadas por el backend y el
 * usuario autenticado se mantiene en memoria (recuperable con /auth/me).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<TokenUser | null>(null);
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isRestaurantUser = computed(() => this.userSignal()?.restaurantId != null);

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  /**
   * Bootstrap al arrancar la app: establece la cookie CSRF y, si hay sesión
   * activa en cookies, restaura el usuario. Nunca falla ni frena indefinidamente el arranque.
   */
  initialize(): Observable<null> {
    return this.bootstrapCsrf().pipe(
      switchMap(() => this.restoreSession()),
      timeout(3000),
      catchError(() => of(null)),
      map(() => null),
    );
  }

  /** Establece la cookie XSRF-TOKEN (GET /auth/csrf). */
  bootstrapCsrf(): Observable<string> {
    return this.api.get<string>('/auth/csrf').pipe(catchError(() => of('')));
  }

  login(email: string, password: string): Observable<TokenUser> {
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap((r) => this.userSignal.set(r.user)),
      map((r) => r.user),
    );
  }

  register(payload: {
    name: string;
    email: string;
    password: string;
    restaurantName: string;
    slug: string;
  }): Observable<TokenUser> {
    return this.api.post<AuthResponse>('/auth/register', payload).pipe(
      tap((r) => this.userSignal.set(r.user)),
      map((r) => r.user),
    );
  }

  /** Renueva los tokens con la cookie refresh_token (rotación server-side). */
  refresh(): Observable<TokenUser | null> {
    return this.api.post<AuthResponse>('/auth/refresh').pipe(
      tap((r) => this.userSignal.set(r.user)),
      map((r) => r.user),
      catchError(() => of(null)),
    );
  }

  logout(): Observable<void> {
    return this.api.post<void>('/auth/logout').pipe(
      tap(() => this.clearSession()),
      catchError(() => {
        this.clearSession();
        return of(undefined);
      }),
    );
  }

  /** Cierra sesión y redirige a /login (no requiere suscripción del llamante). */
  forceLogout(): void {
    this.logout().subscribe();
    this.router.navigate(['/login']);
  }

  /** Restaura la sesión llamando a /auth/me (cookies HttpOnly). */
  restoreSession(): Observable<TokenUser | null> {
    return this.api.get<TokenUser>('/auth/me').pipe(
      tap((user) => this.userSignal.set(user)),
      map((user) => user),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  updateUser(user: TokenUser): void {
    this.userSignal.set(user);
  }

  clearSession(): void {
    this.userSignal.set(null);
  }

  redirectToLogin(): void {
    this.clearSession();
    if (!this.router.url.startsWith('/login')) {
      this.router.navigate(['/login']);
    }
  }
}
