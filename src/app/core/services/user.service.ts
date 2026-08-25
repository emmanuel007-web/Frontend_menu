import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}

  list(): Observable<User[]> {
    return this.api.get<User[]>('/users').pipe(
      catchError(() =>
        of([
          {
            id: 1,
            name: 'Administrador Principal',
            email: 'admin@negobistro.com',
            role: 'ROLE_RESTAURANT_ADMIN',
            restaurantId: 1,
            active: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            name: 'Camarero Jefe',
            email: 'mesas@negobistro.com',
            role: 'ROLE_STAFF',
            restaurantId: 1,
            active: true,
            createdAt: new Date().toISOString(),
          },
        ])
      )
    );
  }

  create(payload: { name: string; email: string; password: string; role?: string }): Observable<User> {
    return this.api.post<User>('/users', payload).pipe(
      catchError(() =>
        of({
          id: Date.now(),
          name: payload.name,
          email: payload.email,
          role: payload.role || 'ROLE_STAFF',
          restaurantId: 1,
          active: true,
          createdAt: new Date().toISOString(),
        })
      )
    );
  }

  setActive(id: number, active: boolean): Observable<void> {
    return this.api.patch<void>(`/users/${id}/active?active=${active}`).pipe(
      catchError(() => of(undefined))
    );
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/users/${id}`).pipe(
      catchError(() => of(undefined))
    );
  }
}
