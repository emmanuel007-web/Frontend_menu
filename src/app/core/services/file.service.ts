import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class FileService {
  constructor(private api: ApiService) {}

  /**
   * Sube una imagen y devuelve su URL pública.
   */
  upload(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<{ url: string }>('/files/upload', formData);
  }
}