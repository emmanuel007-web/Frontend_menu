import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Plan, SubscribeResult, Subscription } from '../models/models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  constructor(private api: ApiService) {}

  listPlans(): Observable<Plan[]> {
    return this.api.get<Plan[]>('/subscriptions/plans');
  }

  getMine(): Observable<Subscription> {
    return this.api.get<Subscription>('/subscriptions/me');
  }

  /** Devuelve la suscripción resultante y, si hay pasarela, la URL del checkout. */
  subscribe(planCode: string): Observable<SubscribeResult> {
    return this.api.post<SubscribeResult>('/subscriptions/subscribe', { planCode });
  }

  cancel(): Observable<Subscription> {
    return this.api.post<Subscription>('/subscriptions/cancel');
  }
}
