import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}

  list(): Observable<User[]> {
    return this.api.get<User[]>('/users');
  }

  create(payload: { name: string; email: string; password: string; role?: string }): Observable<User> {
    return this.api.post<User>('/users', payload);
  }

  setActive(id: number, active: boolean): Observable<void> {
    return this.api.patch<void>(`/users/${id}/active?active=${active}`);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/users/${id}`);
  }
}