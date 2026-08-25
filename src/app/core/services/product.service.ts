import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Page, Product, ProductRequest } from '../models/models';
import { DEMO_PUBLIC_MENU } from '../data/demo-menu.data';

const PRODUCTS_KEY = 'tavita_products_cache';

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private api: ApiService) {}

  private getStored(): Product[] {
    try {
      const stored = localStorage.getItem(PRODUCTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    const initial: Product[] = [];
    for (const cat of DEMO_PUBLIC_MENU.categories) {
      for (const prod of cat.products) {
        initial.push({
          id: prod.id,
          restaurantId: 1,
          categoryId: cat.id,
          name: prod.name,
          description: prod.description,
          price: prod.price,
          imageUrl: prod.imageUrl,
          available: prod.available,
          position: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    this.saveStored(initial);
    return initial;
  }

  private saveStored(products: Product[]): void {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    } catch {}
  }

  list(categoryId?: number, page = 0, size = 50): Observable<Page<Product>> {
    const params = [`page=${page}`, `size=${size}`];
    if (categoryId) params.push(`categoryId=${categoryId}`);
    return this.api.get<Page<Product>>(`/products?${params.join('&')}`).pipe(
      catchError(() => {
        let list = this.getStored();
        if (categoryId) {
          list = list.filter((p) => p.categoryId === categoryId);
        }
        const start = page * size;
        const content = list.slice(start, start + size);
        const pageResult: Page<Product> = {
          content,
          number: page,
          size,
          totalElements: list.length,
          totalPages: Math.ceil(list.length / size) || 1,
        };
        return of(pageResult);
      })
    );
  }

  create(request: ProductRequest): Observable<Product> {
    return this.api.post<Product>('/products', request).pipe(
      catchError(() => {
        const list = this.getStored();
        const newProduct: Product = {
          id: Date.now(),
          restaurantId: 1,
          categoryId: request.categoryId,
          name: request.name,
          description: request.description ?? null,
          price: request.price,
          imageUrl: request.imageUrl ?? null,
          available: request.available ?? true,
          position: request.position ?? 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(newProduct);
        this.saveStored(list);
        return of(newProduct);
      })
    );
  }

  update(id: number, request: ProductRequest): Observable<Product> {
    return this.api.put<Product>(`/products/${id}`, request).pipe(
      catchError(() => {
        const list = this.getStored();
        const idx = list.findIndex((p) => p.id === id);
        if (idx !== -1) {
          const updated: Product = {
            ...list[idx],
            categoryId: request.categoryId,
            name: request.name,
            description: request.description ?? null,
            price: request.price,
            imageUrl: request.imageUrl ?? null,
            available: request.available ?? list[idx].available,
            position: request.position ?? list[idx].position,
            updatedAt: new Date().toISOString(),
          };
          list[idx] = updated;
          this.saveStored(list);
          return of(updated);
        }
        throw new Error('Product not found');
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/products/${id}`).pipe(
      catchError(() => {
        const list = this.getStored().filter((p) => p.id !== id);
        this.saveStored(list);
        return of(undefined);
      })
    );
  }
}
