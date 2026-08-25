import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Restaurant, RestaurantRequest } from '../models/models';
import { DEMO_PUBLIC_MENU } from '../data/demo-menu.data';

const RESTAURANT_KEY = 'tavita_restaurant_me';

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  constructor(private api: ApiService) {}

  private getStored(): Restaurant {
    try {
      const stored = localStorage.getItem(RESTAURANT_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    const demo: Restaurant = {
      id: 1,
      name: DEMO_PUBLIC_MENU.restaurant.name,
      slug: DEMO_PUBLIC_MENU.restaurant.slug,
      logoUrl: DEMO_PUBLIC_MENU.restaurant.logoUrl,
      description: DEMO_PUBLIC_MENU.restaurant.description,
      phone: DEMO_PUBLIC_MENU.restaurant.phone,
      address: DEMO_PUBLIC_MENU.restaurant.address,
      whatsapp: DEMO_PUBLIC_MENU.restaurant.whatsapp,
      instagram: DEMO_PUBLIC_MENU.restaurant.instagram,
      facebook: DEMO_PUBLIC_MENU.restaurant.facebook,
      taxId: DEMO_PUBLIC_MENU.restaurant.taxId || 'NIT: 901.458.912-4',
      estimatedPrepTime: DEMO_PUBLIC_MENU.restaurant.estimatedPrepTime || '20-30 min',
      active: true,
      open: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveStored(demo);
    return demo;
  }

  private saveStored(r: Restaurant): void {
    try {
      localStorage.setItem(RESTAURANT_KEY, JSON.stringify(r));
    } catch {}
  }

  getMine(): Observable<Restaurant> {
    return this.api.get<Restaurant>('/restaurants/me').pipe(
      tap((r) => this.saveStored(r)),
      catchError(() => of(this.getStored()))
    );
  }

  updateMine(request: RestaurantRequest): Observable<Restaurant> {
    return this.api.put<Restaurant>('/restaurants/me', request).pipe(
      tap((r) => this.saveStored(r)),
      catchError(() => {
        const curr = this.getStored();
        const updated: Restaurant = {
          ...curr,
          name: request.name,
          slug: request.slug,
          description: request.description ?? null,
          phone: request.phone ?? null,
          address: request.address ?? null,
          whatsapp: request.whatsapp ?? null,
          instagram: request.instagram ?? null,
          facebook: request.facebook ?? null,
          taxId: request.taxId ?? curr.taxId ?? null,
          estimatedPrepTime: request.estimatedPrepTime ?? curr.estimatedPrepTime ?? '20-30 min',
          updatedAt: new Date().toISOString(),
        };
        this.saveStored(updated);
        return of(updated);
      })
    );
  }

  setOpen(open: boolean): Observable<Restaurant> {
    return this.api.patch<Restaurant>('/restaurants/me/open', { open }).pipe(
      tap((r) => this.saveStored(r)),
      catchError(() => {
        const curr = this.getStored();
        const updated: Restaurant = {
          ...curr,
          open,
          updatedAt: new Date().toISOString(),
        };
        this.saveStored(updated);
        return of(updated);
      })
    );
  }
}

