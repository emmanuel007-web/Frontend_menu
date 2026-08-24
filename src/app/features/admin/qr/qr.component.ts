import { Component, inject, signal, OnInit, computed, effect } from '@angular/core';
import QRCode from 'qrcode';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { QrService } from '../../../core/services/qr.service';

export interface BatchTableItem {
  tableNum: number;
  url: string;
  qrDataUrl: string;
}

@Component({
  selector: 'app-qr',
  templateUrl: './qr.component.html',
})
export class QrComponent implements OnInit {
  private readonly restaurantService = inject(RestaurantService);
  private readonly qrService = inject(QrService);

  readonly mode = signal<'SINGLE' | 'BATCH'>('SINGLE');
  readonly restaurantName = signal<string>('Restaurante');
  readonly restaurantSlug = signal<string>('negobistro-gourmet');
  readonly restaurantLogo = signal<string | null>(null);

  // Single mode config
  readonly isTableSpecific = signal<boolean>(true);
  readonly tableNumber = signal<string>('1');
  readonly callToAction = signal<string>('Escanea con tu celular para ver la carta y pedir');
  
  // Customization
  readonly qrDarkColor = signal<string>('#1c1917');
  readonly qrLightColor = signal<string>('#ffffff');
  readonly templateStyle = signal<'MODERN' | 'GOURMET' | 'CASUAL'>('MODERN');

  // Batch mode config
  readonly batchCount = signal<number>(8);
  readonly batchQrs = signal<BatchTableItem[]>([]);
  readonly generatingBatch = signal<boolean>(false);

  readonly qrDataUrl = signal<string | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly copiedFeedback = signal(false);

  readonly currentMenuUrl = computed(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const slug = this.restaurantSlug();
    const isTable = this.isTableSpecific() && this.mode() === 'SINGLE';
    const table = this.tableNumber().trim();

    if (isTable && table) {
      return `${origin}/menu/${slug}?mesa=${encodeURIComponent(table)}`;
    }
    return `${origin}/menu/${slug}`;
  });

  ngOnInit(): void {
    this.restaurantService.getMine().subscribe({
      next: (rest) => {
        if (rest) {
          this.restaurantName.set(rest.name);
          this.restaurantSlug.set(rest.slug);
          this.restaurantLogo.set(rest.logoUrl);
        }
        this.generateQr();
      },
      error: () => {
        this.generateQr();
      },
    });
  }

  generateQr(): void {
    this.loading.set(true);
    const url = this.currentMenuUrl();

    QRCode.toDataURL(url, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: this.qrDarkColor(),
        light: this.qrLightColor(),
      },
    })
      .then((dataUrl) => {
        this.qrDataUrl.set(dataUrl);
        this.loading.set(false);
      })
      .catch((err) => {
        console.error('Error generating QR:', err);
        this.errorMessage.set('No se pudo generar el código QR.');
        this.loading.set(false);
      });
  }

  setQrColor(darkHex: string): void {
    this.qrDarkColor.set(darkHex);
    this.generateQr();
    if (this.mode() === 'BATCH') {
      this.generateBatch();
    }
  }

  setTemplate(style: 'MODERN' | 'GOURMET' | 'CASUAL'): void {
    this.templateStyle.set(style);
  }

  async generateBatch(): Promise<void> {
    this.generatingBatch.set(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const slug = this.restaurantSlug();
    const count = this.batchCount();
    const items: BatchTableItem[] = [];

    for (let i = 1; i <= count; i++) {
      const url = `${origin}/menu/${slug}?mesa=${i}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 500,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: this.qrDarkColor(),
            light: this.qrLightColor(),
          },
        });
        items.push({ tableNum: i, url, qrDataUrl });
      } catch (e) {
        console.error('Batch QR error for table', i, e);
      }
    }

    this.batchQrs.set(items);
    this.generatingBatch.set(false);
  }

  switchMode(m: 'SINGLE' | 'BATCH'): void {
    this.mode.set(m);
    if (m === 'BATCH' && this.batchQrs().length === 0) {
      this.generateBatch();
    } else if (m === 'SINGLE') {
      this.generateQr();
    }
  }

  copyLink(): void {
    const url = this.currentMenuUrl();
    navigator.clipboard.writeText(url).then(() => {
      this.copiedFeedback.set(true);
      setTimeout(() => this.copiedFeedback.set(false), 2500);
    });
  }

  downloadCardPng(): void {
    const qrSrc = this.qrDataUrl();
    if (!qrSrc) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const style = this.templateStyle();
    const isDark = style === 'GOURMET';
    const isCasual = style === 'CASUAL';

    // Background
    if (isDark) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Gold/Amber accent top bar
      ctx.fillStyle = '#d97706';
      ctx.fillRect(0, 0, canvas.width, 24);
    } else if (isCasual) {
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(0, 0, canvas.width, 24);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, canvas.width, 20);
    }

    // Outer frame border
    ctx.strokeStyle = isDark ? '#334155' : isCasual ? '#fed7aa' : '#e2e8f0';
    ctx.lineWidth = 12;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Restaurant Name
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.fillText(this.restaurantName(), canvas.width / 2, 180);

    // Subtitle / Table Badge
    if (this.isTableSpecific() && this.tableNumber()) {
      ctx.fillStyle = isDark ? '#f59e0b' : '#ea580c';
      ctx.font = '900 48px system-ui, -apple-system, sans-serif';
      ctx.fillText(`MESA ${this.tableNumber()}`, canvas.width / 2, 260);
    } else {
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.font = '600 36px system-ui, -apple-system, sans-serif';
      ctx.fillText('MENÚ DIGITAL & PEDIDOS', canvas.width / 2, 250);
    }

    // Load and draw QR code
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // White container for QR
      const qrBoxSize = 720;
      const qrBoxX = (canvas.width - qrBoxSize) / 2;
      const qrBoxY = 330;

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 40);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Draw QR Image
      const pad = 40;
      ctx.drawImage(img, qrBoxX + pad, qrBoxY + pad, qrBoxSize - pad * 2, qrBoxSize - pad * 2);

      // Call to action text below QR
      ctx.fillStyle = isDark ? '#f8fafc' : '#1e293b';
      ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
      ctx.fillText(this.callToAction(), canvas.width / 2, 1160);

      // Instruction steps
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.font = '500 32px system-ui, -apple-system, sans-serif';
      ctx.fillText('1. Abre tu cámara  •  2. Escanea el código  •  3. Pide a tu gusto', canvas.width / 2, 1240);

      // Powered by
      ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('N E G O C O D E   M E N U', canvas.width / 2, 1480);

      // Trigger download
      const link = document.createElement('a');
      link.download = `tarjeta-mesa-${this.tableNumber() || 'menu'}-${this.restaurantSlug()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrSrc;
  }

  printStands(): void {
    window.print();
  }
}
