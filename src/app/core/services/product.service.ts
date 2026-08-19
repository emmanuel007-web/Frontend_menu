import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Page, Product, ProductRequest } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private api: ApiService) {}

  list(categoryId?: number, page = 0, size = 50): Observable<Page<Product>> {
    const params = [`page=${page}`, `size=${size}`];
    if (categoryId) params.push(`categoryId=${categoryId}`);
    return this.api.get<Page<Product>>(`/products?${params.join('&')}`);
  }

  create(request: ProductRequest): Observable<Product> {
    return this.api.post<Product>('/products', request);
  }

  update(id: number, request: ProductRequest): Observable<Product> {
    return this.api.put<Product>(`/products/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/products/${id}`);
  }
}