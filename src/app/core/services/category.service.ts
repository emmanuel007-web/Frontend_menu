import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Category, CategoryRequest, Page } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private api: ApiService) {}

  list(page = 0, size = 50): Observable<Page<Category>> {
    return this.api.get<Page<Category>>(`/categories?page=${page}&size=${size}`);
  }

  create(request: CategoryRequest): Observable<Category> {
    return this.api.post<Category>('/categories', request);
  }

  update(id: number, request: CategoryRequest): Observable<Category> {
    return this.api.put<Category>(`/categories/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/categories/${id}`);
  }
}