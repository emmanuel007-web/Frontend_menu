import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Restaurant, RestaurantRequest } from '../models/models';
import { DEMO_PUBLIC_MENU } from '../data/demo-menu.data';

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  constructor(private api: ApiService) {}

  getMine(): Observable<Restaurant> {
    return this.api.get<Restaurant>('/restaurants/me').pipe(
      catchError(() => {
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
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return of(demo);
      })
    );
  }

  updateMine(request: RestaurantRequest): Observable<Restaurant> {
    return this.api.put<Restaurant>('/restaurants/me', request);
  }
}
