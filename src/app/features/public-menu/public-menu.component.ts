import { Component, effect, inject, input, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuService } from '../../core/services/menu.service';
import { OrderService } from '../../core/services/order.service';
import { CartItem, Order, PublicMenu } from '../../core/models/models';

@Component({
  selector: 'app-public-menu',
  imports: [ReactiveFormsModule],
  templateUrl: './public-menu.component.html',
})
export class PublicMenuComponent {
  private readonly menuService = inject(MenuService);
  private readonly orderService = inject(OrderService);
  private readonly fb = inject(FormBuilder);

  readonly slug = input<string>('');

  readonly menu = signal<PublicMenu | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly activeCategory = signal<number | null>(null);

  // Carrito de compras
  readonly cart = signal<CartItem[]>([]);
  readonly showCartModal = signal(false);
  readonly submittingOrder = signal(false);
  readonly orderSuccess = signal<Order | null>(null);
  readonly orderErrorMessage = signal<string | null>(null);

  readonly orderForm: FormGroup = this.fb.group({
    customerName: ['', [Validators.required, Validators.maxLength(120)]],
    customerPhone: ['', Validators.maxLength(30)],
    tableNumber: ['', Validators.maxLength(30)],
    notes: [''],
  });

  readonly cartTotalCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly cartTotalAmount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );

  constructor() {
    effect(() => {
      const slug = this.slug().trim();
      if (!slug) {
        this.errorMessage.set('Este menú no existe o no está disponible');
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      this.errorMessage.set(null);
      this.menuService.getPublicMenu(slug).subscribe({
        next: (menu) => {
          this.menu.set(menu);
          this.activeCategory.set(menu.categories.length > 0 ? menu.categories[0]!.id : null);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Este menú no existe o no está disponible');
          this.loading.set(false);
        },
      });
    });
  }

  selectCategory(id: number): void {
    this.activeCategory.set(id);
  }

  addToCart(product: { id: number; name: string; price: number; imageUrl: string | null }): void {
    this.cart.update((items) => {
      const existing = items.find((i) => i.productId === product.id);
      if (existing) {
        return items.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...items,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          imageUrl: product.imageUrl,
          quantity: 1,
        },
      ];
    });
  }

  removeFromCart(productId: number): void {
    this.cart.update((items) => {
      const existing = items.find((i) => i.productId === productId);
      if (!existing) return items;
      if (existing.quantity <= 1) {
        return items.filter((i) => i.productId !== productId);
      }
      return items.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i));
    });
  }

  getItemQuantity(productId: number): number {
    return this.cart().find((i) => i.productId === productId)?.quantity ?? 0;
  }

  openCart(): void {
    if (this.cart().length > 0) {
      this.orderErrorMessage.set(null);
      this.showCartModal.set(true);
    }
  }

  closeCart(): void {
    this.showCartModal.set(false);
  }

  submitOrder(): void {
    if (this.orderForm.invalid || this.cart().length === 0 || this.submittingOrder()) return;

    this.submittingOrder.set(true);
    this.orderErrorMessage.set(null);

    const payload = {
      customerName: this.orderForm.value.customerName,
      customerPhone: this.orderForm.value.customerPhone,
      tableNumber: this.orderForm.value.tableNumber,
      notes: this.orderForm.value.notes,
      items: this.cart().map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      })),
    };

    this.orderService.createPublicOrder(this.slug(), payload).subscribe({
      next: (order) => {
        this.submittingOrder.set(false);
        this.showCartModal.set(false);
        this.cart.set([]);
        this.orderForm.reset();
        this.orderSuccess.set(order);
      },
      error: (err) => {
        this.submittingOrder.set(false);
        this.orderErrorMessage.set(err.error?.message ?? 'No se pudo enviar el pedido. Intenta nuevamente.');
      },
    });
  }

  closeSuccessModal(): void {
    this.orderSuccess.set(null);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
      if (target.parentElement) {
        target.parentElement.innerHTML = '<div class="w-full h-full rounded-2xl bg-stone-100 flex items-center justify-center text-3xl shadow-sm border border-stone-200 text-stone-300 select-none">🍽️</div>';
      }
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  }
}