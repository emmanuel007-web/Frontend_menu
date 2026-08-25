import { Component, inject, signal, OnInit, computed, effect } from '@angular/core';
import QRCode from 'qrcode';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { QrService } from '../../../core/services/qr.service';

export type QrDotStyle = 'SQUARE' | 'ROUNDED' | 'DOTS' | 'DIAMOND';
export type QrEyeFrameStyle = 'SQUARE' | 'ROUNDED' | 'CIRCLE' | 'LEAF';
export type QrEyeBallStyle = 'SQUARE' | 'ROUNDED' | 'CIRCLE' | 'DIAMOND';
export type QrColorMode = 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
export type QrTemplateStyle = 'MODERN' | 'GOURMET' | 'CASUAL' | 'NEON' | 'STICKER' | 'ACRYLIC';

export interface BatchTableItem {
  tableNum: number;
  tableLabel: string;
  url: string;
  qrDataUrl: string;
}

export interface PresetIcon {
  id: string;
  label: string;
  emoji: string;
}

export const PRESET_ICONS: PresetIcon[] = [
  { id: 'utensils', label: 'Cubiertos', emoji: '🍽️' },
  { id: 'burger', label: 'Hamburguesa', emoji: '🍔' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'coffee', label: 'Cafetería', emoji: '☕' },
  { id: 'cocktail', label: 'Bar & Tragos', emoji: '🍹' },
  { id: 'wine', label: 'Vinos', emoji: '🍷' },
  { id: 'grill', label: 'Parrilla', emoji: '🔥' },
  { id: 'taco', label: 'Tacos / Mex', emoji: '🌮' },
  { id: 'dessert', label: 'Postres', emoji: '🍰' },
  { id: 'sparkles', label: 'Tavita Star', emoji: '✨' },
];

export interface ColorPreset {
  name: string;
  dark: string;
  dark2?: string;
  light: string;
  eye?: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Negro Clásico', dark: '#18181b', light: '#ffffff' },
  { name: 'Atardecer Ámbar', dark: '#ea580c', dark2: '#f59e0b', light: '#ffffff' },
  { name: 'Gourmet Borgoña', dark: '#831843', dark2: '#be123c', light: '#ffffff', eye: '#9f1239' },
  { name: 'Océano Índigo', dark: '#1e3a8a', dark2: '#0284c7', light: '#ffffff', eye: '#0369a1' },
  { name: 'Bosque Esmeralda', dark: '#064e3b', dark2: '#059669', light: '#ffffff', eye: '#047857' },
  { name: 'Dorado & Chocolate', dark: '#451a03', dark2: '#d97706', light: '#fffbeb', eye: '#b45309' },
  { name: 'Púrpura Neón', dark: '#581c87', dark2: '#a855f7', light: '#ffffff', eye: '#7e22ce' },
  { name: 'Carbón Dark Mode', dark: '#38bdf8', dark2: '#818cf8', light: '#0f172a', eye: '#38bdf8' },
];

@Component({
  selector: 'app-qr',
  templateUrl: './qr.component.html',
})
export class QrComponent implements OnInit {
  private readonly restaurantService = inject(RestaurantService);
  private readonly qrService = inject(QrService);

  readonly activeTab = signal<'SHAPES' | 'COLORS' | 'LOGO' | 'STAND'>('SHAPES');
  readonly mode = signal<'SINGLE' | 'BATCH'>('SINGLE');

  // Restaurant info
  readonly restaurantName = signal<string>('Restaurante');
  readonly restaurantSlug = signal<string>('negobistro-gourmet');
  readonly restaurantLogo = signal<string | null>(null);

  // Single mode config
  readonly isTableSpecific = signal<boolean>(true);
  readonly tablePrefix = signal<string>('Mesa');
  readonly tableNumber = signal<string>('1');
  readonly standTitle = signal<string>('¡Bienvenidos!');
  readonly callToAction = signal<string>('Escanea con tu celular para ver la carta y pedir');
  readonly showInstructions = signal<boolean>(true);
  readonly instructionsText = signal<string>('1. Abre tu cámara  •  2. Escanea el código  •  3. Pide directo');

  // WiFi & Social info for Stand
  readonly showWifi = signal<boolean>(false);
  readonly wifiNetwork = signal<string>('');
  readonly wifiPassword = signal<string>('');
  readonly showSocial = signal<boolean>(false);
  readonly instagramHandle = signal<string>('@negobistro');

  // Customization - Shapes
  readonly dotStyle = signal<QrDotStyle>('ROUNDED');
  readonly eyeFrameStyle = signal<QrEyeFrameStyle>('ROUNDED');
  readonly eyeBallStyle = signal<QrEyeBallStyle>('ROUNDED');

  // Customization - Colors
  readonly colorMode = signal<QrColorMode>('SOLID');
  readonly gradientAngle = signal<number>(45);
  readonly qrDarkColor = signal<string>('#18181b');
  readonly qrDarkColor2 = signal<string>('#ea580c');
  readonly qrLightColor = signal<string>('#ffffff');
  readonly customEyeColor = signal<boolean>(false);
  readonly qrEyeColor = signal<string>('#ea580c');
  readonly transparentBg = signal<boolean>(false);

  // Customization - Logo
  readonly showLogo = signal<boolean>(true);
  readonly logoType = signal<'REST_LOGO' | 'PRESET_ICON' | 'CUSTOM_URL'>('PRESET_ICON');
  readonly selectedPresetIcon = signal<string>('utensils');
  readonly customLogoUrl = signal<string>('');
  readonly logoShape = signal<'CIRCLE' | 'ROUNDED' | 'SHIELD'>('CIRCLE');
  readonly logoSize = signal<'SM' | 'MD' | 'LG'>('MD');
  readonly logoBgColor = signal<string>('#ffffff');

  // Stand Template
  readonly templateStyle = signal<QrTemplateStyle>('MODERN');

  // Batch mode config
  readonly batchCount = signal<number>(8);
  readonly batchPrefix = signal<string>('Mesa');
  readonly batchQrs = signal<BatchTableItem[]>([]);
  readonly generatingBatch = signal<boolean>(false);

  // Generated QR output
  readonly qrDataUrl = signal<string | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly copiedFeedback = signal(false);

  readonly presetIcons = PRESET_ICONS;
  readonly colorPresets = COLOR_PRESETS;

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
          if (rest.logoUrl) {
            this.restaurantLogo.set(rest.logoUrl);
            this.logoType.set('REST_LOGO');
          }
          if (rest.instagram) {
            this.instagramHandle.set(rest.instagram.startsWith('@') ? rest.instagram : `@${rest.instagram}`);
          }
        }
        this.generateQr();
      },
      error: () => {
        this.generateQr();
      },
    });
  }

  // Generate QR on an offscreen HTML5 canvas with custom matrix styling
  async generateQr(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const url = this.currentMenuUrl();
      const dataUrl = await this.renderCustomQrCanvas(url, 800);
      this.qrDataUrl.set(dataUrl);
      this.loading.set(false);
    } catch (err) {
      console.error('Error generating customized QR:', err);
      this.errorMessage.set('No se pudo generar el código QR personalizado.');
      this.loading.set(false);
    }
  }

  // Core Canvas Renderer for artistic QR Code
  private async renderCustomQrCanvas(text: string, canvasSize: number): Promise<string> {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
    const moduleCount = qr.modules.size;
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');

    const margin = canvasSize * 0.06; // 6% padding
    const innerSize = canvasSize - margin * 2;
    const moduleSize = innerSize / moduleCount;

    // 1. Draw Background
    if (!this.transparentBg()) {
      ctx.fillStyle = this.qrLightColor();
      ctx.fillRect(0, 0, canvasSize, canvasSize);
    } else {
      ctx.clearRect(0, 0, canvasSize, canvasSize);
    }

    // 2. Prepare Foreground Fill Style (Solid or Gradient)
    let fillStyle: string | CanvasGradient = this.qrDarkColor();
    if (this.colorMode() === 'GRADIENT_LINEAR') {
      const angleRad = (this.gradientAngle() * Math.PI) / 180;
      const x1 = margin + (Math.cos(angleRad) < 0 ? innerSize : 0);
      const y1 = margin + (Math.sin(angleRad) < 0 ? innerSize : 0);
      const x2 = margin + (Math.cos(angleRad) >= 0 ? innerSize : 0);
      const y2 = margin + (Math.sin(angleRad) >= 0 ? innerSize : 0);
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, this.qrDarkColor());
      grad.addColorStop(1, this.qrDarkColor2());
      fillStyle = grad;
    } else if (this.colorMode() === 'GRADIENT_RADIAL') {
      const cx = canvasSize / 2;
      const cy = canvasSize / 2;
      const grad = ctx.createRadialGradient(cx, cy, innerSize * 0.05, cx, cy, innerSize * 0.65);
      grad.addColorStop(0, this.qrDarkColor2());
      grad.addColorStop(1, this.qrDarkColor());
      fillStyle = grad;
    }

    // Helper: is position inside one of the 3 corner finder patterns (7x7)
    const isFinderPattern = (r: number, c: number): boolean => {
      if (r < 7 && c < 7) return true; // Top-Left
      if (r < 7 && c >= moduleCount - 7) return true; // Top-Right
      if (r >= moduleCount - 7 && c < 7) return true; // Bottom-Left
      return false;
    };

    // Helper: is position inside central logo zone
    const hasCenterLogo = this.showLogo();
    let logoModuleRadius = 0;
    if (hasCenterLogo) {
      if (this.logoSize() === 'SM') logoModuleRadius = Math.floor(moduleCount * 0.11);
      else if (this.logoSize() === 'LG') logoModuleRadius = Math.floor(moduleCount * 0.16);
      else logoModuleRadius = Math.floor(moduleCount * 0.13); // MD
    }
    const centerMod = Math.floor(moduleCount / 2);

    const isCenterLogoZone = (r: number, c: number): boolean => {
      if (!hasCenterLogo) return false;
      const dist = Math.sqrt(Math.pow(r - centerMod, 2) + Math.pow(c - centerMod, 2));
      return dist <= logoModuleRadius + 0.8;
    };

    // 3. Draw Data Modules (Excluding Finders and Logo Zone)
    ctx.fillStyle = fillStyle;
    const dotType = this.dotStyle();

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (isFinderPattern(r, c) || isCenterLogoZone(r, c)) continue;

        const isDark = (qr.modules as any).get ? (qr.modules as any).get(r, c) : (qr.modules.data as any)[r * moduleCount + c] === 1;
        if (!isDark) continue;

        const x = margin + c * moduleSize;
        const y = margin + r * moduleSize;

        if (dotType === 'DOTS') {
          ctx.beginPath();
          ctx.arc(x + moduleSize / 2, y + moduleSize / 2, (moduleSize * 0.88) / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (dotType === 'ROUNDED') {
          ctx.beginPath();
          const pad = moduleSize * 0.08;
          ctx.roundRect(x + pad, y + pad, moduleSize - pad * 2, moduleSize - pad * 2, moduleSize * 0.35);
          ctx.fill();
        } else if (dotType === 'DIAMOND') {
          ctx.beginPath();
          const cx = x + moduleSize / 2;
          const cy = y + moduleSize / 2;
          const sz = (moduleSize * 0.9) / 2;
          ctx.moveTo(cx, cy - sz);
          ctx.lineTo(cx + sz, cy);
          ctx.lineTo(cx, cy + sz);
          ctx.lineTo(cx - sz, cy);
          ctx.closePath();
          ctx.fill();
        } else {
          // SQUARE
          ctx.fillRect(x, y, moduleSize + 0.3, moduleSize + 0.3);
        }
      }
    }

    // 4. Draw The 3 Finder Pattern Eyes with Custom Shapes
    const eyeColor = this.customEyeColor() ? this.qrEyeColor() : fillStyle;
    const finders = [
      { r: 0, c: 0, pos: 'TL' },
      { r: 0, c: moduleCount - 7, pos: 'TR' },
      { r: moduleCount - 7, c: 0, pos: 'BL' },
    ];

    for (const f of finders) {
      const fx = margin + f.c * moduleSize;
      const fy = margin + f.r * moduleSize;
      const fSize = 7 * moduleSize;

      this.drawFinderPatternEye(ctx, fx, fy, fSize, moduleSize, eyeColor, f.pos);
    }

    // 5. Draw Center Logo / Badge if enabled
    if (hasCenterLogo) {
      await this.drawCenterLogo(ctx, canvasSize / 2, canvasSize / 2, logoModuleRadius * moduleSize * 2.2);
    }

    return canvas.toDataURL('image/png');
  }

  // Draw an artistic Finder Pattern (Outer 7x7 ring + Inner 3x3 pupil)
  private drawFinderPatternEye(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    moduleSize: number,
    eyeColor: string | CanvasGradient,
    position: string
  ): void {
    const frameStyle = this.eyeFrameStyle();
    const ballStyle = this.eyeBallStyle();
    const bg = this.transparentBg() ? '#ffffff' : this.qrLightColor();

    // Outer Frame (7x7)
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    if (frameStyle === 'CIRCLE') {
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    } else if (frameStyle === 'ROUNDED') {
      ctx.roundRect(x, y, size, size, size * 0.28);
    } else if (frameStyle === 'LEAF') {
      // Leaf effect: round opposite corners
      const r1 = position === 'TR' ? 0 : size * 0.45;
      const r2 = position === 'TL' ? 0 : size * 0.45;
      const r3 = position === 'BL' ? 0 : size * 0.45;
      const r4 = position === 'TR' ? size * 0.45 : 0;
      ctx.roundRect(x, y, size, size, [r1, r2, r3, r4]);
    } else {
      ctx.rect(x, y, size, size);
    }
    ctx.fill();

    // Inner cutout (5x5 module)
    const cutMargin = moduleSize;
    const cutSize = size - cutMargin * 2;
    ctx.fillStyle = bg;
    ctx.beginPath();
    if (frameStyle === 'CIRCLE') {
      ctx.arc(x + size / 2, y + size / 2, cutSize / 2, 0, Math.PI * 2);
    } else if (frameStyle === 'ROUNDED' || frameStyle === 'LEAF') {
      ctx.roundRect(x + cutMargin, y + cutMargin, cutSize, cutSize, cutSize * 0.22);
    } else {
      ctx.rect(x + cutMargin, y + cutMargin, cutSize, cutSize);
    }
    ctx.fill();

    // Inner Pupil (3x3 module)
    const ballMargin = moduleSize * 2;
    const ballSize = size - ballMargin * 2;
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    if (ballStyle === 'CIRCLE') {
      ctx.arc(x + size / 2, y + size / 2, ballSize / 2, 0, Math.PI * 2);
    } else if (ballStyle === 'ROUNDED') {
      ctx.roundRect(x + ballMargin, y + ballMargin, ballSize, ballSize, ballSize * 0.3);
    } else if (ballStyle === 'DIAMOND') {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const hs = ballSize / 2;
      ctx.moveTo(cx, cy - hs);
      ctx.lineTo(cx + hs, cy);
      ctx.lineTo(cx, cy + hs);
      ctx.lineTo(cx - hs, cy);
      ctx.closePath();
    } else {
      ctx.rect(x + ballMargin, y + ballMargin, ballSize, ballSize);
    }
    ctx.fill();
  }

  // Draw Center Logo/Icon with aesthetic background badge & shadow
  private async drawCenterLogo(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    logoBoxSize: number
  ): Promise<void> {
    const half = logoBoxSize / 2;
    const shape = this.logoShape();

    // Shadow & Background Badge
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = this.logoBgColor();

    ctx.beginPath();
    if (shape === 'CIRCLE') {
      ctx.arc(cx, cy, half, 0, Math.PI * 2);
    } else if (shape === 'ROUNDED') {
      ctx.roundRect(cx - half, cy - half, logoBoxSize, logoBoxSize, logoBoxSize * 0.28);
    } else {
      // Shield
      ctx.roundRect(cx - half, cy - half, logoBoxSize, logoBoxSize, [logoBoxSize * 0.2, logoBoxSize * 0.2, logoBoxSize * 0.45, logoBoxSize * 0.45]);
    }
    ctx.fill();
    ctx.restore();

    // Subtle Outline Border
    ctx.strokeStyle = this.customEyeColor() ? this.qrEyeColor() : this.qrDarkColor();
    ctx.lineWidth = Math.max(2, logoBoxSize * 0.04);
    ctx.beginPath();
    if (shape === 'CIRCLE') {
      ctx.arc(cx, cy, half - 1, 0, Math.PI * 2);
    } else if (shape === 'ROUNDED') {
      ctx.roundRect(cx - half + 1, cy - half + 1, logoBoxSize - 2, logoBoxSize - 2, logoBoxSize * 0.26);
    } else {
      ctx.roundRect(cx - half + 1, cy - half + 1, logoBoxSize - 2, logoBoxSize - 2, [logoBoxSize * 0.18, logoBoxSize * 0.18, logoBoxSize * 0.43, logoBoxSize * 0.43]);
    }
    ctx.stroke();

    // Content: Image or Preset Emoji/Icon
    const type = this.logoType();
    let imgSource: string | null = null;

    if (type === 'REST_LOGO' && this.restaurantLogo()) {
      imgSource = this.restaurantLogo();
    } else if (type === 'CUSTOM_URL' && this.customLogoUrl()) {
      imgSource = this.customLogoUrl();
    }

    if (imgSource) {
      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.save();
            // Clip to shape
            ctx.beginPath();
            if (shape === 'CIRCLE') {
              ctx.arc(cx, cy, half * 0.82, 0, Math.PI * 2);
            } else {
              ctx.roundRect(cx - half * 0.82, cy - half * 0.82, logoBoxSize * 0.82, logoBoxSize * 0.82, logoBoxSize * 0.2);
            }
            ctx.clip();
            ctx.drawImage(img, cx - half * 0.82, cy - half * 0.82, logoBoxSize * 0.82, logoBoxSize * 0.82);
            ctx.restore();
            resolve();
          };
          img.onerror = () => {
            this.drawFallbackIcon(ctx, cx, cy, logoBoxSize);
            resolve();
          };
          img.src = imgSource!;
        });
      } catch {
        this.drawFallbackIcon(ctx, cx, cy, logoBoxSize);
      }
    } else {
      this.drawFallbackIcon(ctx, cx, cy, logoBoxSize);
    }
  }

  private drawFallbackIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, logoBoxSize: number): void {
    const iconObj = this.presetIcons.find((i) => i.id === this.selectedPresetIcon()) || this.presetIcons[0];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(logoBoxSize * 0.52)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.fillText(iconObj.emoji, cx, cy + 2);
  }

  // Preset Selection Handlers
  applyColorPreset(preset: ColorPreset): void {
    this.qrDarkColor.set(preset.dark);
    this.qrLightColor.set(preset.light);
    if (preset.dark2) {
      this.qrDarkColor2.set(preset.dark2);
      this.colorMode.set('GRADIENT_LINEAR');
    } else {
      this.colorMode.set('SOLID');
    }
    if (preset.eye) {
      this.customEyeColor.set(true);
      this.qrEyeColor.set(preset.eye);
    } else {
      this.customEyeColor.set(false);
    }
    this.generateQr();
    if (this.mode() === 'BATCH') {
      this.generateBatch();
    }
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.customLogoUrl.set(result);
        this.logoType.set('CUSTOM_URL');
        this.generateQr();
      };
      reader.readAsDataURL(file);
    }
  }

  setTemplate(style: QrTemplateStyle): void {
    this.templateStyle.set(style);
  }

  async generateBatch(): Promise<void> {
    this.generatingBatch.set(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const slug = this.restaurantSlug();
    const count = this.batchCount();
    const prefix = this.batchPrefix().trim() || 'Mesa';
    const items: BatchTableItem[] = [];

    for (let i = 1; i <= count; i++) {
      const url = `${origin}/menu/${slug}?mesa=${i}`;
      try {
        const qrDataUrl = await this.renderCustomQrCanvas(url, 600);
        items.push({ tableNum: i, tableLabel: `${prefix} ${i}`, url, qrDataUrl });
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

  // 1. Download Stand Card PNG (1200x1600 px)
  downloadCardPng(): void {
    const qrSrc = this.qrDataUrl();
    if (!qrSrc) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const style = this.templateStyle();
    const isGourmet = style === 'GOURMET';
    const isCasual = style === 'CASUAL';
    const isNeon = style === 'NEON';
    const isSticker = style === 'STICKER';
    const isAcrylic = style === 'ACRYLIC';

    // Background styling
    if (isGourmet) {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Gold frame gradient
      const borderGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      borderGrad.addColorStop(0, '#f59e0b');
      borderGrad.addColorStop(0.5, '#d97706');
      borderGrad.addColorStop(1, '#b45309');
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 14;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    } else if (isNeon) {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Neon glow border
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 12;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    } else if (isCasual) {
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(0, 0, canvas.width, 26);
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 12;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    } else {
      // Modern & Acrylic
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, canvas.width, 24);
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 10;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    }

    // Top Header Badge
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = isGourmet ? '#f59e0b' : isNeon ? '#38bdf8' : isCasual ? '#ea580c' : '#71717a';
    ctx.fillText('•  CARTA DIGITAL & PEDIDOS  •', canvas.width / 2, 130);

    // Restaurant Name
    ctx.font = '900 62px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = isGourmet || isNeon ? '#ffffff' : '#0f172a';
    ctx.fillText(this.restaurantName(), canvas.width / 2, 215);

    // Table Badge
    if (this.isTableSpecific() && this.tableNumber()) {
      const tableText = `${this.tablePrefix().toUpperCase()} ${this.tableNumber()}`;
      const badgeY = 275;
      ctx.fillStyle = isGourmet ? '#d97706' : isNeon ? '#06b6d4' : isCasual ? '#ea580c' : '#18181b';
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 200, badgeY, 400, 70, 35);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px system-ui, -apple-system, sans-serif';
      ctx.fillText(tableText, canvas.width / 2, badgeY + 48);
    }

    // Load and draw QR code
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const qrBoxSize = 720;
      const qrBoxX = (canvas.width - qrBoxSize) / 2;
      const qrBoxY = 380;

      // QR Background Card
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.14)';
      ctx.shadowBlur = 36;
      ctx.shadowOffsetY = 16;
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 44);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Draw QR Image
      const pad = 36;
      ctx.drawImage(img, qrBoxX + pad, qrBoxY + pad, qrBoxSize - pad * 2, qrBoxSize - pad * 2);

      // Call to action text
      ctx.fillStyle = isGourmet || isNeon ? '#f8fafc' : '#1e293b';
      ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
      ctx.fillText(this.callToAction(), canvas.width / 2, 1180);

      // Instructions
      if (this.showInstructions()) {
        ctx.fillStyle = isGourmet ? '#94a3b8' : isNeon ? '#a5f3fc' : '#64748b';
        ctx.font = '500 30px system-ui, -apple-system, sans-serif';
        ctx.fillText(this.instructionsText(), canvas.width / 2, 1245);
      }

      // WiFi banner if enabled
      if (this.showWifi() && this.wifiNetwork()) {
        const wifiText = `📶 WiFi: ${this.wifiNetwork()}  |  Clave: ${this.wifiPassword() || 'Libre'}`;
        ctx.fillStyle = isGourmet ? 'rgba(245, 158, 11, 0.15)' : '#f1f5f9';
        ctx.beginPath();
        ctx.roundRect(canvas.width / 2 - 380, 1290, 760, 60, 30);
        ctx.fill();

        ctx.fillStyle = isGourmet ? '#f59e0b' : '#334155';
        ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
        ctx.fillText(wifiText, canvas.width / 2, 1330);
      }

      // Social handle if enabled
      if (this.showSocial() && this.instagramHandle()) {
        ctx.fillStyle = isGourmet ? '#cbd5e1' : '#64748b';
        ctx.font = '600 26px system-ui, -apple-system, sans-serif';
        ctx.fillText(`📸 Síguenos en Instagram: ${this.instagramHandle()}`, canvas.width / 2, 1400);
      }

      // Footer
      ctx.fillStyle = isGourmet ? '#64748b' : '#94a3b8';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('P O W E R E D   B Y   T A V I T A   M E N U', canvas.width / 2, 1510);

      // Trigger download
      const link = document.createElement('a');
      link.download = `stand-${this.tablePrefix().toLowerCase()}-${this.tableNumber() || 'menu'}-${this.restaurantSlug()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrSrc;
  }

  // 2. Download Pure QR Code PNG (1024x1024 px)
  async downloadPureQrPng(): Promise<void> {
    const text = this.currentMenuUrl();
    const dataUrl = await this.renderCustomQrCanvas(text, 1024);
    const link = document.createElement('a');
    link.download = `qr-code-${this.tablePrefix().toLowerCase()}-${this.tableNumber() || 'general'}.png`;
    link.href = dataUrl;
    link.click();
  }

  // 3. Download Scalable Vector Graphics (SVG)
  downloadSvg(): void {
    const text = this.currentMenuUrl();
    const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
    const moduleCount = qr.modules.size;
    const size = 1000;
    const margin = 50;
    const innerSize = size - margin * 2;
    const moduleSize = innerSize / moduleCount;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">\n`;
    
    if (!this.transparentBg()) {
      svg += `  <rect width="${size}" height="${size}" fill="${this.qrLightColor()}"/>\n`;
    }

    const darkColor = this.qrDarkColor();
    const dotType = this.dotStyle();

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        const isDark = (qr.modules as any).get ? (qr.modules as any).get(r, c) : (qr.modules.data as any)[r * moduleCount + c] === 1;
        if (!isDark) continue;

        const x = margin + c * moduleSize;
        const y = margin + r * moduleSize;

        if (dotType === 'DOTS') {
          svg += `  <circle cx="${x + moduleSize / 2}" cy="${y + moduleSize / 2}" r="${(moduleSize * 0.88) / 2}" fill="${darkColor}"/>\n`;
        } else if (dotType === 'ROUNDED') {
          const rx = moduleSize * 0.3;
          svg += `  <rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" rx="${rx}" fill="${darkColor}"/>\n`;
        } else {
          svg += `  <rect x="${x}" y="${y}" width="${moduleSize + 0.1}" height="${moduleSize + 0.1}" fill="${darkColor}"/>\n`;
        }
      }
    }

    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `qr-vector-${this.tablePrefix().toLowerCase()}-${this.tableNumber() || 'general'}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  printStands(): void {
    window.print();
  }
}

