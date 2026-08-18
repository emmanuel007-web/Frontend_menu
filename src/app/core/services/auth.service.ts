import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { TokenResponse, TokenUser } from '../models/models';

const ACCESS_KEY = 'menu_saas_access';
const REFRESH_KEY = 'menu_saas_refresh';
const USER_KEY = 'menu_saas_user';

/**
 * Estado de autenticación basado en signals + persistencia en localStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<TokenUser | null>(this.readStoredUser());
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isRestaurantUser = computed(() => this.userSignal()?.restaurantId != null);

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.api
      .post<TokenResponse>('/auth/login', { email, password })
      .pipe(tap((t) => this.persist(t)));
  }

  register(payload: {
    name: string;
    email: string;
    password: string;
    restaurantName: string;
    slug: string;
  }): Observable<TokenResponse> {
    return this.api.post<TokenResponse>('/auth/register', payload).pipe(tap((t) => this.persist(t)));
  }

  refresh(): Observable<TokenResponse> {
    const token = this.refreshToken;
    if (!token) {
      throw new Error('Sin refresh token');
    }
    return this.api.post<TokenResponse>('/auth/refresh', { refreshToken: token }).pipe(
      tap((t) => this.persist(t)),
    );
  }

  logout(): void {
    const token = this.refreshToken;
    if (token) {
      this.api.post('/auth/logout', { refreshToken: token }).subscribe({
        error: () => undefined,
      });
    }
    this.clear();
    this.router.navigate(['/login']);
  }

  updateUser(user: TokenUser): void {
    this.userSignal.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private persist(t: TokenResponse): void {
    localStorage.setItem(ACCESS_KEY, t.accessToken);
    localStorage.setItem(REFRESH_KEY, t.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(t.user));
    this.userSignal.set(t.user);
  }

  private clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
  }

  private readStoredUser(): TokenUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TokenUser;
    } catch {
      return null;
    }
  }
}