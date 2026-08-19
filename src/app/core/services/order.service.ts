import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CreateOrderRequest, Order, OrderStatus } from '../models/models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private api: ApiService) {}

  createPublicOrder(slug: string, payload: CreateOrderRequest): Observable<Order> {
    return this.api.post<Order>(`/public/orders/${slug}`, payload);
  }

  listMine(status?: OrderStatus): Observable<Order[]> {
    const path = status ? `/orders?status=${status}` : '/orders';
    return this.api.get<Order[]>(path);
  }

  getMine(id: number): Observable<Order> {
    return this.api.get<Order>(`/orders/${id}`);
  }

  updateStatusMine(id: number, status: OrderStatus): Observable<Order> {
    return this.api.patch<Order>(`/orders/${id}/status`, { status });
  }
}
