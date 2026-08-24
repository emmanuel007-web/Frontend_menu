import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { PublicMenu } from '../models/models';
import { DEMO_PUBLIC_MENU } from '../data/demo-menu.data';
import { MULTI_RESTAURANT_MENUS, DIRECTORY_RESTAURANTS } from '../data/directory-restaurants.data';

@Injectable({ providedIn: 'root' })
export class MenuService {
  constructor(private api: ApiService) {}

  getPublicMenu(slug: string): Observable<PublicMenu> {
    return this.api.get<PublicMenu>(`/public/menu/${encodeURIComponent(slug)}`).pipe(
      catchError(() => {
        // 1. Check if specific menu is defined in MULTI_RESTAURANT_MENUS
        if (MULTI_RESTAURANT_MENUS[slug]) {
          return of(MULTI_RESTAURANT_MENUS[slug]);
        }

        // 2. Check if restaurant exists in DIRECTORY_RESTAURANTS
        const dirMatch = DIRECTORY_RESTAURANTS.find((r) => r.slug === slug);
        if (dirMatch) {
          const customMenu: PublicMenu = {
            restaurant: {
              name: dirMatch.name,
              slug: dirMatch.slug,
              logoUrl: dirMatch.logoUrl,
              description: dirMatch.description,
              phone: dirMatch.phone,
              address: dirMatch.address,
              whatsapp: dirMatch.whatsapp,
              instagram: `${dirMatch.slug.replace(/-/g, '')}`,
              facebook: null,
            },
            categories: DEMO_PUBLIC_MENU.categories,
          };
          return of(customMenu);
        }

        // 3. Fallback demo menu with the requested slug or name
        const fallback = {
          ...DEMO_PUBLIC_MENU,
          restaurant: {
            ...DEMO_PUBLIC_MENU.restaurant,
            slug: slug || 'negobistro-gourmet',
            name: slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : DEMO_PUBLIC_MENU.restaurant.name,
          },
        };
        return of(fallback);
      })
    );
  }
}
