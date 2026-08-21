import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { Plan, Subscription } from '../../../core/models/models';

declare const ePayco: any;

@Component({
  selector: 'app-settings',
  imports: [DatePipe],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly plans = signal<Plan[]>([]);
  readonly subscription = signal<Subscription | null>(null);
  readonly loading = signal(true);
  readonly subscribing = signal(false);
  readonly message = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  ngOnInit(): void {
    this.subscriptionService.listPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.subscriptionService.getMine().subscribe({
      next: (subscription) => this.subscription.set(subscription),
      error: () => undefined,
    });
  }

  subscribe(code: string): void {
    if (this.subscribing()) return;
    this.subscribing.set(true);
    this.message.set(null);

    this.subscriptionService.subscribe(code).subscribe({
      next: (result) => {
        this.subscription.set(result.subscription);
        if (result.checkoutSessionId) {
          this.openEpaycoCheckout(result.checkoutSessionId);
          return;
        }
        this.subscribing.set(false);
        this.message.set({ type: 'success', text: 'Plan activado correctamente' });
      },
      error: (err) => {
        this.subscribing.set(false);
        this.message.set({ type: 'error', text: err.error?.message ?? 'No se pudo activar el plan' });
      },
    });
  }

  private openEpaycoCheckout(sessionId: string): void {
    if (!isPlatformBrowser(this.platformId) || typeof ePayco === 'undefined') {
      this.subscribing.set(false);
      this.message.set({ type: 'error', text: 'No se pudo cargar el checkout de pagos' });
      return;
    }

    const checkout = ePayco.checkout.configure({
      sessionId,
      type: 'onpage',
      test: true,
    });

    checkout.setHooks({
      onCreated: (_data: any) => {
        this.message.set({ type: 'success', text: 'Checkout de pago abierto' });
      },
      onResponse: (_response: any) => {
        this.message.set({ type: 'success', text: 'Pago procesado correctamente' });
      },
      onErrors: (_error: any) => {
        this.message.set({ type: 'error', text: 'Error al procesar el pago' });
      },
      onClosed: (_errors: any) => {
        this.subscribing.set(false);
        this.subscriptionService.getMine().subscribe({
          next: (subscription) => this.subscription.set(subscription),
          error: () => undefined,
        });
      },
    });

    checkout.open();
  }

  cancel(): void {
    if (this.subscribing()) return;
    this.subscribing.set(true);
    this.message.set(null);

    this.subscriptionService.cancel().subscribe({
      next: (subscription) => {
        this.subscription.set(subscription);
        this.subscribing.set(false);
        this.message.set({ type: 'success', text: 'Suscripción cancelada' });
      },
      error: (err) => {
        this.subscribing.set(false);
        this.message.set({ type: 'error', text: err.error?.message ?? 'No se pudo cancelar la suscripción' });
      },
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  }
}
