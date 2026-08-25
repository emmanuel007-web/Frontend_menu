import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AdminCreateRestaurant, AdminRestaurant, AdminStats, AdminUser } from '../models/models';
import { DIRECTORY_RESTAURANTS } from '../data/directory-restaurants.data';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private api: ApiService) {}

  getStats(): Observable<AdminStats> {
    return this.api.get<AdminStats>('/admin/stats').pipe(
      catchError(() =>
        of({
          totalRestaurants: DIRECTORY_RESTAURANTS.length,
          activeRestaurants: DIRECTORY_RESTAURANTS.filter((r) => r.isOpen).length,
          totalUsers: 14,
          activeSubscriptions: 8,
          totalProducts: 120,
        })
      )
    );
  }

  listRestaurants(): Observable<AdminRestaurant[]> {
    return this.api.get<AdminRestaurant[]>('/admin/restaurants').pipe(
      catchError(() => {
        const list: AdminRestaurant[] = DIRECTORY_RESTAURANTS.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          logoUrl: r.logoUrl ?? null,
          phone: r.phone ?? null,
          address: r.address ?? null,
          active: true,
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          userCount: 2,
          productCount: r.productCount || 15,
          planName: 'Plan Pro',
          adminEmail: `admin@${r.slug}.com`,
        }));
        return of(list);
      })
    );
  }

  createRestaurant(payload: AdminCreateRestaurant): Observable<AdminRestaurant> {
    return this.api.post<AdminRestaurant>('/admin/restaurants', payload).pipe(
      catchError(() => {
        const newR: AdminRestaurant = {
          id: Date.now(),
          name: payload.restaurantName,
          slug: payload.slug,
          logoUrl: null,
          phone: null,
          address: null,
          active: true,
          createdAt: new Date().toISOString(),
          userCount: 1,
          productCount: 0,
          planName: payload.planCode || 'Plan Básico',
          adminEmail: payload.adminEmail,
        };
        return of(newR);
      })
    );
  }

  toggleRestaurantActive(id: number, active: boolean): Observable<void> {
    return this.api.patch<void>(`/admin/restaurants/${id}/active?active=${active}`, {}).pipe(
      catchError(() => of(undefined))
    );
  }

  listUsers(): Observable<AdminUser[]> {
    return this.api.get<AdminUser[]>('/admin/users').pipe(
      catchError(() =>
        of([
          {
            id: 1,
            name: 'Super Administrador',
            email: 'superadmin@tavita.com',
            role: 'ROLE_SUPER_ADMIN',
            restaurantId: null,
            restaurantName: 'Plataforma Tavita',
            active: true,
            createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
          },
          {
            id: 2,
            name: 'Carlos Mendoza',
            email: 'admin@negobistro.com',
            role: 'ROLE_RESTAURANT_ADMIN',
            restaurantId: 1,
            restaurantName: 'NegoBistro & Parrilla Gourmet',
            active: true,
            createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          },
          {
            id: 3,
            name: 'Marco Rossi',
            email: 'admin@bellanapoli.com',
            role: 'ROLE_RESTAURANT_ADMIN',
            restaurantId: 2,
            restaurantName: 'Bella Napoli Forno & Pizzería',
            active: true,
            createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
          },
        ])
      )
    );
  }

  toggleUserActive(id: number, active: boolean): Observable<void> {
    return this.api.patch<void>(`/admin/users/${id}/active?active=${active}`, {}).pipe(
      catchError(() => of(undefined))
    );
  }
}


