import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Product, ProductRequest } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private api: ApiService) {}

  list(categoryId?: number): Observable<Product[]> {
    return this.api.get<Product[]>(`/products${categoryId ? `?categoryId=${categoryId}` : ''}`);
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