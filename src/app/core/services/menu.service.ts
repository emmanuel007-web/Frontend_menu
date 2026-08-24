import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { PublicMenu } from '../models/models';
import { DEMO_PUBLIC_MENU } from '../data/demo-menu.data';

@Injectable({ providedIn: 'root' })
export class MenuService {
  constructor(private api: ApiService) {}

  getPublicMenu(slug: string): Observable<PublicMenu> {
    return this.api.get<PublicMenu>(`/public/menu/${encodeURIComponent(slug)}`).pipe(
      catchError(() => {
        // Fallback demo menu with the requested slug or name
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
