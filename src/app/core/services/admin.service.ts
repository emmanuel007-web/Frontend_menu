import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AdminCreateRestaurant, AdminRestaurant, AdminStats, AdminUser } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private api: ApiService) {}

  getStats(): Observable<AdminStats> {
    return this.api.get<AdminStats>('/admin/stats');
  }

  listRestaurants(): Observable<AdminRestaurant[]> {
    return this.api.get<AdminRestaurant[]>('/admin/restaurants');
  }

  createRestaurant(payload: AdminCreateRestaurant): Observable<AdminRestaurant> {
    return this.api.post<AdminRestaurant>('/admin/restaurants', payload);
  }

  toggleRestaurantActive(id: number, active: boolean): Observable<void> {
    return this.api.patch<void>(`/admin/restaurants/${id}/active?active=${active}`, {});
  }

  listUsers(): Observable<AdminUser[]> {
    return this.api.get<AdminUser[]>('/admin/users');
  }

  toggleUserActive(id: number, active: boolean): Observable<void> {
    return this.api.patch<void>(`/admin/users/${id}/active?active=${active}`, {});
  }
}
