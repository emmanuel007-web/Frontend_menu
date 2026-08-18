import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { Plan, Subscription } from '../../../core/models/models';

@Component({
  selector: 'app-settings',
  imports: [DatePipe],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);

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
      next: (subscription) => {
        this.subscription.set(subscription);
        this.subscribing.set(false);
        this.message.set({ type: 'success', text: 'Plan activado correctamente' });
      },
      error: (err) => {
        this.subscribing.set(false);
        this.message.set({ type: 'error', text: err.error?.message ?? 'No se pudo activar el plan' });
      },
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  }
}