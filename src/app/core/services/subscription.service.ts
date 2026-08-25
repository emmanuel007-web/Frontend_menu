import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Plan, SubscribeResult, Subscription } from '../models/models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  constructor(private api: ApiService) {}

  listPlans(): Observable<Plan[]> {
    return this.api.get<Plan[]>('/subscriptions/plans').pipe(
      catchError(() =>
        of([
          {
            id: 1,
            code: 'BASIC',
            name: 'Plan Básico',
            description: 'Ideal para cafeterías y pequeños restaurantes',
            priceMonthly: 49000,
            priceAnnual: 490000,
            maxProducts: 30,
            maxCategories: 5,
            qrCustomization: false,
            analytics: false,
            active: true,
          },
          {
            id: 2,
            code: 'PRO',
            name: 'Plan Pro Gourmet',
            description: 'Para restaurantes consolidados con alto volumen de pedidos',
            priceMonthly: 89000,
            priceAnnual: 890000,
            maxProducts: 200,
            maxCategories: 20,
            qrCustomization: true,
            analytics: true,
            active: true,
          },
          {
            id: 3,
            code: 'ENTERPRISE',
            name: 'Plan Cadenas & Franquicias',
            description: 'Soporte prioritario y múltiples sedes',
            priceMonthly: 199000,
            priceAnnual: 1990000,
            maxProducts: 1000,
            maxCategories: 100,
            qrCustomization: true,
            analytics: true,
            active: true,
          },
        ])
      )
    );
  }

  getMine(): Observable<Subscription> {
    return this.api.get<Subscription>('/subscriptions/me').pipe(
      catchError(() =>
        of({
          id: 1,
          restaurantId: 1,
          plan: {
            id: 2,
            code: 'PRO',
            name: 'Plan Pro Gourmet',
            description: 'Para restaurantes consolidados con alto volumen de pedidos',
            priceMonthly: 89000,
          },
          status: 'ACTIVE',
          provider: 'MERCADO_PAGO',
          startsAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          endsAt: new Date(Date.now() + 20 * 86400000).toISOString(),
        })
      )
    );
  }

  subscribe(planCode: string): Observable<SubscribeResult> {
    return this.api.post<SubscribeResult>('/subscriptions/subscribe', { planCode }).pipe(
      catchError(() =>
        of({
          subscription: {
            id: 1,
            restaurantId: 1,
            plan: {
              id: 2,
              code: planCode,
              name: planCode === 'BASIC' ? 'Plan Básico' : 'Plan Pro Gourmet',
              description: 'Actualizado',
              priceMonthly: 89000,
            },
            status: 'ACTIVE',
            provider: 'MERCADO_PAGO',
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          },
          checkoutSessionId: null,
        })
      )
    );
  }

  cancel(): Observable<Subscription> {
    return this.api.post<Subscription>('/subscriptions/cancel').pipe(
      catchError(() =>
        of({
          id: 1,
          restaurantId: 1,
          plan: {
            id: 2,
            code: 'PRO',
            name: 'Plan Pro Gourmet',
            description: 'Cancelación al final del periodo',
            priceMonthly: 89000,
          },
          status: 'CANCELED',
          provider: 'MERCADO_PAGO',
          startsAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          endsAt: new Date(Date.now() + 20 * 86400000).toISOString(),
        })
      )
    );
  }
}

