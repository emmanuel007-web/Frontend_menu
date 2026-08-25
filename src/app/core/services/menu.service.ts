import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { PublicMenu } from '../models/models';
import { DEMO_PUBLIC_MENU } from '../data/demo-menu.data';
import { MULTI_RESTAURANT_MENUS } from '../data/directory-restaurants.data';

@Injectable({ providedIn: 'root' })
export class MenuService {
  constructor(private api: ApiService) {}

  getPublicMenu(slug: string): Observable<PublicMenu> {
    return this.api.get<PublicMenu>(`/public/menu/${encodeURIComponent(slug)}`).pipe(
      catchError(() => {
        const found = MULTI_RESTAURANT_MENUS[slug];
        if (found) {
          return of(found);
        }
        return of(DEMO_PUBLIC_MENU);
      })
    );
  }
}

