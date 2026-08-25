import { Component, inject, signal, OnInit, computed, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderService } from '../../../core/services/order.service';
import { Order, OrderStatus } from '../../../core/models/models';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
})
export class OrdersComponent implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private orderSub?: Subscription;
  private pollingTimer?: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>;
  private pollCount = 0;
  private pollCountdownTimer?: ReturnType<typeof setInterval>;

  // Aggressive polling: 3s for the first 60s, then 12s
  private readonly FAST_POLL_MS = 3_000;
  private readonly SLOW_POLL_MS = 12_000;
  private readonly FAST_POLL_DURATION_S = 60;

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // View settings
  readonly viewMode = signal<'KANBAN' | 'LIST'>('KANBAN');
  readonly searchQuery = signal('');
  readonly statusFilter = signal<OrderStatus | 'ALL'>('ALL');
  readonly soundEnabled = signal(true);

  // Selected order for Ticket / Detail Modal
  readonly selectedTicketOrder = signal<Order | null>(null);

  // New order alert banner
  readonly showAlert = signal(false);
  readonly alertCount = signal(0);

  // Live filtered orders
  readonly filteredOrders = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return this.orders().filter((order) => {
      if (status !== 'ALL' && order.status !== status) {
        return false;
      }
      if (!query) return true;

      const matchNum = order.orderNumber.toLowerCase().includes(query);
      const matchName = order.customerName.toLowerCase().includes(query);
      const matchTable = (order.tableNumber || '').toLowerCase().includes(query);
      const matchPhone = (order.customerPhone || '').toLowerCase().includes(query);

      return matchNum || matchName || matchTable || matchPhone;
    });
  });

  // Kanban Columns
  readonly pendingOrders = computed(() =>
    this.filteredOrders().filter((o) => o.status === 'PENDING')
  );

  readonly inProgressOrders = computed(() =>
    this.filteredOrders().filter((o) => o.status === 'CONFIRMED')
  );

  readonly deliveredOrders = computed(() =>
    this.filteredOrders().filter((o) => o.status === 'DELIVERED')
  );

  readonly cancelledOrders = computed(() =>
    this.filteredOrders().filter((o) => o.status === 'CANCELLED')
  );

  // Stats Counters
  readonly totalActiveCount = computed(() =>
    this.orders().filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED').length
  );

  readonly totalRevenueToday = computed(() =>
    this.orders()
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0)
  );

  ngOnInit(): void {
    this.fetchOrders();

    // Listen to real-time incoming orders
    this.orderSub = this.orderService.onNewOrder$.subscribe((newOrder) => {
      this.orders.update((list) => {
        const existing = list.findIndex((o) => o.id === newOrder.id);
        if (existing !== -1) {
          const updated = [...list];
          updated[existing] = newOrder;
          return updated;
        }
        return [newOrder, ...list];
      });

      if (this.soundEnabled()) {
        this.playKitchenNotificationSound();
      }
    });

    // Polling: starts fast (3s) then slows down (12s) after 60s
    this.startPolling();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    this.orderSub?.unsubscribe();
    this.stopPolling();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  fetchOrders(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.orderService.listMine().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  // --- Polling: detect new orders from other devices & fire alarm ---

  private startPolling(): void {
    this.pollCount = 0;
    this.pollForNewOrders(); // Immediate first poll
    this.scheduleNextPoll();

    // Countdown to switch from fast → slow polling
    this.pollCountdownTimer = setInterval(() => {
      if (this.pollCount >= this.FAST_POLL_DURATION_S) {
        this.stopPolling();
        this.startSlowPolling();
      }
    }, 1_000);
  }

  private scheduleNextPoll(): void {
    this.pollingTimer = setTimeout(() => {
      this.pollForNewOrders();
      this.scheduleNextPoll();
    }, this.FAST_POLL_MS);
  }

  private startSlowPolling(): void {
    this.pollCountdownTimer = undefined;
    this.pollingTimer = setInterval(() => this.pollForNewOrders(), this.SLOW_POLL_MS);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer as ReturnType<typeof setTimeout>);
      clearInterval(this.pollingTimer as ReturnType<typeof setInterval>);
      this.pollingTimer = undefined;
    }
    if (this.pollCountdownTimer) {
      clearInterval(this.pollCountdownTimer);
      this.pollCountdownTimer = undefined;
    }
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopPolling();
    } else {
      this.pollCount = 0;
      this.stopPolling();
      this.startPolling(); // Restart fast polling when page becomes visible again
    }
  };

  dismissAlert(): void {
    this.showAlert.set(false);
  }

  private pollForNewOrders(): void {
    if (this.loading()) return;
    this.orderService.listMine(undefined, true).subscribe({
      next: (latest) => {
        const current = this.orders();
        const currentIds = new Set(current.map((o) => o.id));
        const newOrders = latest.filter((o) => !currentIds.has(o.id));

        this.orders.set(latest);

        if (newOrders.length > 0) {
          this.alertCount.set(newOrders.length);
          this.showAlert.set(true);
          setTimeout(() => this.showAlert.set(false), 6_000);

          if (this.soundEnabled()) {
            this.playKitchenNotificationSound();
          }
        }
      },
      error: () => {
        // Auth expired or network down — user will see stale data but no crash
      }
    });
  }

  updateStatus(order: Order, newStatus: OrderStatus): void {
    // Optimistic update
    this.orders.update((list) =>
      list.map((o) => (o.id === order.id ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o))
    );

    if (this.selectedTicketOrder()?.id === order.id) {
      this.selectedTicketOrder.update((o) => (o ? { ...o, status: newStatus } : null));
    }

    this.orderService.updateStatusMine(order.id, newStatus).subscribe({
      error: (err) => {
        console.error('Error updating order status:', err);
      },
    });
  }

  openTicketModal(order: Order): void {
    this.selectedTicketOrder.set(order);
  }

  closeTicketModal(): void {
    this.selectedTicketOrder.set(null);
  }

  printTicket(): void {
    window.print();
  }

  simulateIncomingOrder(): void {
    const order = this.orderService.simulateNewOrder();
    this.openTicketModal(order);
  }

  toggleSound(): void {
    this.soundEnabled.update((s) => !s);
  }

  // Synthesized Web Audio chime for kitchen alerts (~5 seconds)
  private playKitchenNotificationSound(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const CHIME_INTERVAL_MS = 800;
      const TOTAL_DURATION_MS = 5000;
      const CHIMES = Math.ceil(TOTAL_DURATION_MS / CHIME_INTERVAL_MS);

      const playChime = (index: number) => {
        const t = ctx.currentTime;

        // First tone: D5
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, t);

        // Second tone: A5 (rises up for kitchen bell feel)
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(440.00, t);
        osc2.frequency.setValueAtTime(659.25, t + 0.06);

        const gain = ctx.createGain();
        // Slightly louder on first two chimes for attention
        const peakVol = index < 2 ? 0.35 : 0.25;
        gain.gain.setValueAtTime(peakVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.35);
        osc2.stop(t + 0.35);
      };

      for (let i = 0; i < CHIMES; i++) {
        setTimeout(() => playChime(i), i * CHIME_INTERVAL_MS);
      }

      // Close the AudioContext after all chimes finish
      setTimeout(() => ctx.close(), TOTAL_DURATION_MS + 200);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  }

  formatDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-CO');
    } catch {
      return '';
    }
  }

  formatTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  getTimeElapsed(isoString: string): string {
    try {
      const start = new Date(isoString).getTime();
      const now = Date.now();
      const mins = Math.floor((now - start) / 60000);
      if (mins < 1) return 'Hace un momento';
      if (mins === 1) return 'Hace 1 min';
      return `Hace ${mins} min`;
    } catch {
      return '';
    }
  }
}
