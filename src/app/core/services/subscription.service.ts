import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Plan, Subscription } from '../models/models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  constructor(private api: ApiService) {}

  listPlans(): Observable<Plan[]> {
    return this.api.get<Plan[]>('/subscriptions/plans');
  }

  getMine(): Observable<Subscription> {
    return this.api.get<Subscription>('/subscriptions/me');
  }

  subscribe(planCode: string): Observable<Subscription> {
    return this.api.post<Subscription>('/subscriptions/subscribe', { planCode });
  }
}