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
  private pollingTimer?: ReturnType<typeof setInterval>;

  private readonly POLL_INTERVAL_MS = 12_000;
  private readonly visiblePageHandler = () => this.onVisibilityChange();

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

    // Polling: fetch new orders periodically when the page is visible
    this.startPolling();
    document.addEventListener('visibilitychange', this.visiblePageHandler);
  }

  ngOnDestroy(): void {
    this.orderSub?.unsubscribe();
    this.stopPolling();
    document.removeEventListener('visibilitychange', this.visiblePageHandler);
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
    this.pollingTimer = setInterval(() => this.pollForNewOrders(), this.POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }

  private onVisibilityChange(): void {
    if (document.hidden) {
      this.stopPolling();
    } else {
      this.pollForNewOrders(); // Immediately refresh when the tab comes back
      this.startPolling();
    }
  }

  private pollForNewOrders(): void {
    if (this.loading()) return;
    this.orderService.listMine().subscribe({
      next: (latest) => {
        const current = this.orders();
        const currentIds = new Set(current.map((o) => o.id));
        const newOrders = latest.filter((o) => !currentIds.has(o.id));

        this.orders.set(latest);

        if (newOrders.length > 0 && this.soundEnabled()) {
          for (let i = 0; i < newOrders.length; i++) {
            setTimeout(() => this.playKitchenNotificationSound(), i * 400);
          }
        }
      },
      error: () => {} // Silent — polling failures are transient
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

  // Synthesized Web Audio chime for kitchen alerts
  private playKitchenNotificationSound(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880.00, now + 0.12); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440.00, now);
      osc2.frequency.setValueAtTime(659.25, now + 0.12);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
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
