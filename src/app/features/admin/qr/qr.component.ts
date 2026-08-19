import { Component, inject, signal, OnInit } from '@angular/core';
import QRCode from 'qrcode';
import { QrService } from '../../../core/services/qr.service';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-qr',
  templateUrl: './qr.component.html',
})
export class QrComponent implements OnInit {
  private readonly qrService = inject(QrService);
  private readonly api = inject(ApiService);

  readonly menuUrl = signal<string | null>(null);
  readonly qrDataUrl = signal<string | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.qrService.getMenuUrl().subscribe({
      next: (res) => {
        const url = res?.url;
        if (!url) {
          this.loading.set(false);
          return;
        }
        this.menuUrl.set(url);
        QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
          .then((dataUrl) => {
            this.qrDataUrl.set(dataUrl);
            this.loading.set(false);
          })
          .catch(() => this.loading.set(false));
      },
      error: () => {
        this.errorMessage.set('No se pudo generar el QR');
        this.loading.set(false);
      },
    });
  }

  downloadPng(): void {
    fetch(`${environment.apiUrl}/qr/png`, { credentials: 'include' })
      .then((res) => res.blob())
      .then((blob) => this.saveBlob(blob, 'qr-menu.png'))
      .catch(() => this.errorMessage.set('No se pudo descargar el PNG'));
  }

  downloadPdf(): void {
    fetch(`${environment.apiUrl}/qr/pdf`, { credentials: 'include' })
      .then((res) => res.blob())
      .then((blob) => this.saveBlob(blob, 'qr-menu.pdf'))
      .catch(() => this.errorMessage.set('No se pudo descargar el PDF'));
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}