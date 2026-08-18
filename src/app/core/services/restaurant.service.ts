import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Restaurant, RestaurantRequest } from '../models/models';

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  constructor(private api: ApiService) {}

  getMine(): Observable<Restaurant> {
    return this.api.get<Restaurant>('/restaurants/me');
  }

  updateMine(request: RestaurantRequest): Observable<Restaurant> {
    return this.api.put<Restaurant>('/restaurants/me', request);
  }
}