import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/models';

/**
 * Cliente HTTP de la API. Con withCredentials las cookies HttpOnly
 * (access_token/refresh_token/XSRF-TOKEN) se envían en cada petición,
 * como hace el navegador con el dominio del backend.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(this.url(path), this.options()).pipe(map((r) => r.data));
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(this.url(path), body, this.options()).pipe(map((r) => r.data));
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(this.url(path), body, this.options()).pipe(map((r) => r.data));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<ApiResponse<T>>(this.url(path), body, this.options()).pipe(map((r) => r.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(this.url(path), this.options()).pipe(map((r) => r.data));
  }

  raw<T>(path: string): Observable<T> {
    return this.http.get<T>(this.url(path), this.options());
  }

  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  }

  private options(): { withCredentials: boolean } {
    return { withCredentials: true };
  }
}
