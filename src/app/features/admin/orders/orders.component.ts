import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { Order, OrderStatus, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../../core/models/models';

@Component({
  selector: 'app-orders',
  imports: [DatePipe],
  templateUrl: './orders.component.html',
})
export class OrdersComponent implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly selectedStatus = signal<OrderStatus | 'ALL'>('ALL');
  readonly selectedOrder = signal<Order | null>(null);
  readonly updatingStatus = signal(false);

  readonly labels = ORDER_STATUS_LABELS;
  readonly colors = ORDER_STATUS_COLORS;

  private refreshInterval: any;

  readonly filteredOrders = computed(() => {
    const status = this.selectedStatus();
    if (status === 'ALL') return this.orders();
    return this.orders().filter((o) => o.status === status);
  });

  readonly pendingCount = computed(() => this.orders().filter((o) => o.status === 'PENDING').length);
  readonly preparationCount = computed(() => this.orders().filter((o) => o.status === 'IN_PREPARATION').length);
  readonly readyCount = computed(() => this.orders().filter((o) => o.status === 'READY').length);

  ngOnInit(): void {
    this.loadOrders();
    // Auto-refresh cada 15 segundos para recibir nuevos pedidos
    this.refreshInterval = setInterval(() => this.loadOrders(true), 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadOrders(silent = false): void {
    if (!silent) this.loading.set(true);
    this.orderService.listMine().subscribe({
      next: (data) => {
        this.orders.set(data);
        if (!silent) this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changeStatus(order: Order, newStatus: OrderStatus): void {
    this.updatingStatus.set(true);
    this.orderService.updateStatusMine(order.id, newStatus).subscribe({
      next: (updated) => {
        this.updatingStatus.set(false);
        this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
        if (this.selectedOrder()?.id === updated.id) {
          this.selectedOrder.set(updated);
        }
      },
      error: () => this.updatingStatus.set(false),
    });
  }

  openOrderDetail(order: Order): void {
    this.selectedOrder.set(order);
  }

  closeDetail(): void {
    this.selectedOrder.set(null);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  }
}
