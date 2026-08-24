import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { PublicMenu } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MenuService {
  constructor(private api: ApiService) {}

  getPublicMenu(slug: string): Observable<PublicMenu> {
    return this.api.get<PublicMenu>(`/public/menu/${encodeURIComponent(slug)}`).pipe(
      catchError((err) => throwError(() => err))
    );
  }
}
