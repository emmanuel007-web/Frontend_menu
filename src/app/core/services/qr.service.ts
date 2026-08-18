import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class QrService {
  constructor(private api: ApiService) {}

  getMenuUrl(): Observable<{ url: string }> {
    return this.api.get<{ url: string }>('/qr/url');
  }
}