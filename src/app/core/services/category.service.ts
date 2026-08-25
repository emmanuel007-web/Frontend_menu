import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Category, CategoryRequest, Page } from '../models/models';
import { DEMO_PUBLIC_MENU } from '../data/demo-menu.data';

const CATEGORIES_KEY = 'tavita_categories_cache';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private api: ApiService) {}

  private getStored(): Category[] {
    try {
      const stored = localStorage.getItem(CATEGORIES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    const initial: Category[] = DEMO_PUBLIC_MENU.categories.map((c) => ({
      id: c.id,
      restaurantId: 1,
      name: c.name,
      description: c.description ?? null,
      position: c.position,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    this.saveStored(initial);
    return initial;
  }

  private saveStored(categories: Category[]): void {
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    } catch {}
  }

  list(page = 0, size = 50): Observable<Page<Category>> {
    return this.api.get<Page<Category>>(`/categories?page=${page}&size=${size}`).pipe(
      catchError(() => {
        const list = this.getStored();
        const start = page * size;
        const content = list.slice(start, start + size);
        const pageResult: Page<Category> = {
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

  create(request: CategoryRequest): Observable<Category> {
    return this.api.post<Category>('/categories', request).pipe(
      catchError(() => {
        const list = this.getStored();
        const newCat: Category = {
          id: Date.now(),
          restaurantId: 1,
          name: request.name,
          description: request.description ?? null,
          position: request.position ?? list.length + 1,
          active: request.active ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(newCat);
        this.saveStored(list);
        return of(newCat);
      })
    );
  }

  update(id: number, request: CategoryRequest): Observable<Category> {
    return this.api.put<Category>(`/categories/${id}`, request).pipe(
      catchError(() => {
        const list = this.getStored();
        const idx = list.findIndex((c) => c.id === id);
        if (idx !== -1) {
          const updated: Category = {
            ...list[idx],
            name: request.name,
            description: request.description ?? null,
            position: request.position ?? list[idx].position,
            active: request.active ?? list[idx].active,
            updatedAt: new Date().toISOString(),
          };
          list[idx] = updated;
          this.saveStored(list);
          return of(updated);
        }
        throw new Error('Category not found');
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/categories/${id}`).pipe(
      catchError(() => {
        const list = this.getStored().filter((c) => c.id !== id);
        this.saveStored(list);
        return of(undefined);
      })
    );
  }
}
