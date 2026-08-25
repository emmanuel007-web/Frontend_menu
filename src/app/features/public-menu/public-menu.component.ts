import { Component, effect, inject, input, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { OrderService } from '../../core/services/order.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { CartItem, Order, OrderType, PublicMenu } from '../../core/models/models';

interface DishModalItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryName?: string;
}

@Component({
  selector: 'app-public-menu',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './public-menu.component.html',
})
export class PublicMenuComponent {
  private readonly menuService = inject(MenuService);
  private readonly orderService = inject(OrderService);
  private readonly invoiceService = inject(InvoiceService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly slug = input<string>('');

  readonly menu = signal<PublicMenu | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly activeCategory = signal<number | null>(null);

  // Search & Filter signals
  readonly searchQuery = signal('');
  readonly activeFilterTag = signal<string>('ALL');

  // Dish detail modal
  readonly selectedDish = signal<DishModalItem | null>(null);
  readonly dishDetailQuantity = signal(1);
  readonly dishDetailNotes = signal('');

  // Cart & Ordering
  readonly cart = signal<CartItem[]>([]);
  readonly showCartModal = signal(false);
  readonly submittingOrder = signal(false);
  readonly orderSuccess = signal<Order | null>(null);
  readonly orderErrorMessage = signal<string | null>(null);

  // Invoice view / download modal
  readonly showInvoiceModal = signal(false);
  readonly invoiceOrder = signal<Order | null>(null);

  // Order Type: DINE_IN, DELIVERY, TAKEAWAY
  readonly orderType = signal<OrderType>('DINE_IN');
  readonly selectedTablePreset = signal<string>('1');

  readonly orderForm: FormGroup = this.fb.group({
    customerName: ['', [Validators.required, Validators.maxLength(120)]],
    customerPhone: ['', [Validators.maxLength(30)]],
    tableNumber: ['Mesa 1', [Validators.maxLength(40)]],
    deliveryAddress: [''],
    notes: [''],
  });

  readonly cartTotalCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly cartTotalAmount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );

  /** El dueño puede cerrar el restaurante: se bloquea todo pedido. */
  readonly isClosed = computed(() => this.menu()?.restaurant.open === false);

  /** Tiempo estimado de preparación configurado por el restaurante */
  readonly estimatedPrepTime = computed(
    () => this.menu()?.restaurant.estimatedPrepTime || '20-30 min'
  );

  // Filtered categories & products based on search & tags
  readonly filteredCategories = computed(() => {
    const currentMenu = this.menu();
    if (!currentMenu) return [];

    const query = this.searchQuery().trim().toLowerCase();
    const tag = this.activeFilterTag();

    return currentMenu.categories
      .map((category) => {
        const filteredProducts = category.products.filter((product) => {
          const matchQuery =
            !query ||
            product.name.toLowerCase().includes(query) ||
            (product.description && product.description.toLowerCase().includes(query));

          if (!matchQuery) return false;

          if (tag === 'ALL') return true;
          if (tag === 'POPULAR') return product.price > 28000;
          if (tag === 'VEGAN') return product.name.toLowerCase().includes('vegan') || category.name.toLowerCase().includes('ensalada');
          if (tag === 'DRINKS') return category.name.toLowerCase().includes('bebida') || category.name.toLowerCase().includes('cóctel');
          if (tag === 'MEAT') return category.name.toLowerCase().includes('brasa') || category.name.toLowerCase().includes('corte') || category.name.toLowerCase().includes('hamburguesa');

          return true;
        });

        return {
          ...category,
          products: filteredProducts,
        };
      })
      .filter((cat) => cat.products.length > 0);
  });

  constructor() {
    // Check query params for table / mesa preset and search dish
    this.route.queryParamMap.subscribe((params) => {
      const mesa = params.get('mesa') || params.get('table') || params.get('m');
      if (mesa) {
        this.selectedTablePreset.set(mesa);
        this.orderForm.patchValue({ tableNumber: `Mesa ${mesa}` });
      }

      const q = params.get('q');
      if (q) {
        this.searchQuery.set(q);
      }
    });

    effect(() => {
      const slugVal = this.slug().trim() || 'negobistro-gourmet';
      this.loading.set(true);
      this.errorMessage.set(null);

      this.menuService.getPublicMenu(slugVal).subscribe({
        next: (menuData) => {
          this.menu.set(menuData);
          if (menuData.categories.length > 0) {
            this.activeCategory.set(menuData.categories[0].id);
          }
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar el menú.');
          this.loading.set(false);
        },
      });
    });
  }

  setCategory(id: number): void {
    this.activeCategory.set(id);
    // Smooth scroll to category anchor
    const el = document.getElementById(`category-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  setFilterTag(tag: string): void {
    this.activeFilterTag.set(tag);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.activeFilterTag.set('ALL');
  }

  // Dish modal
  openDishModal(product: { id: number; name: string; description: string | null; price: number; imageUrl: string | null }, categoryName?: string): void {
    this.selectedDish.set({
      ...product,
      categoryName,
    });
    this.dishDetailQuantity.set(1);
    this.dishDetailNotes.set('');
  }

  closeDishModal(): void {
    this.selectedDish.set(null);
  }

  increaseDetailQuantity(): void {
    this.dishDetailQuantity.update((q) => q + 1);
  }

  decreaseDetailQuantity(): void {
    this.dishDetailQuantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  addDetailToCart(): void {
    const dish = this.selectedDish();
    if (!dish) return;

    this.addToCart(dish, this.dishDetailQuantity(), this.dishDetailNotes().trim());
    this.closeDishModal();
  }

  // Cart operations
  addToCart(
    product: { id: number; name: string; price: number; imageUrl: string | null; categoryName?: string },
    quantity = 1,
    notes = ''
  ): void {
    if (this.isClosed()) return;
    this.cart.update((items) => {
      const existingIndex = items.findIndex((i) => i.productId === product.id && i.notes === notes);
      if (existingIndex !== -1) {
        const updated = [...items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [
        ...items,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          imageUrl: product.imageUrl,
          quantity,
          notes: notes || undefined,
          categoryName: product.categoryName,
        },
      ];
    });
  }

  removeFromCart(productId: number, notes?: string): void {
    this.cart.update((items) => {
      const existing = items.find((i) => i.productId === productId && i.notes === notes);
      if (!existing) return items;
      if (existing.quantity <= 1) {
        return items.filter((i) => !(i.productId === productId && i.notes === notes));
      }
      return items.map((i) => (i.productId === productId && i.notes === notes ? { ...i, quantity: i.quantity - 1 } : i));
    });
  }

  deleteCartItem(productId: number, notes?: string): void {
    this.cart.update((items) => items.filter((i) => !(i.productId === productId && i.notes === notes)));
  }

  getItemQuantity(productId: number): number {
    return this.cart()
      .filter((i) => i.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
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

  setOrderType(type: OrderType): void {
    this.orderType.set(type);
    if (type === 'DINE_IN') {
      this.orderForm.patchValue({ tableNumber: `Mesa ${this.selectedTablePreset()}` });
    } else if (type === 'DELIVERY') {
      this.orderForm.patchValue({ tableNumber: 'Domicilio' });
    } else {
      this.orderForm.patchValue({ tableNumber: 'Para Llevar' });
    }
  }

  selectTable(num: string): void {
    this.selectedTablePreset.set(num);
    this.orderForm.patchValue({ tableNumber: `Mesa ${num}` });
  }

  submitOrder(): void {
    if (this.isClosed() || this.orderForm.invalid || this.cart().length === 0 || this.submittingOrder()) return;

    this.submittingOrder.set(true);
    this.orderErrorMessage.set(null);

    const payload = {
      customerName: this.orderForm.value.customerName,
      customerPhone: this.orderForm.value.customerPhone,
      tableNumber: this.orderForm.value.tableNumber,
      orderType: this.orderType(),
      deliveryAddress: this.orderForm.value.deliveryAddress,
      notes: this.orderForm.value.notes,
      items: this.cart().map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      })),
    };

    const targetSlug = this.slug().trim() || this.menu()?.restaurant.slug || 'negobistro-gourmet';

    this.orderService.createPublicOrder(targetSlug, payload).subscribe({
      next: (order) => {
        this.submittingOrder.set(false);
        this.showCartModal.set(false);
        this.cart.set([]);
        this.orderSuccess.set(order);
      },
      error: (err) => {
        this.submittingOrder.set(false);
        this.orderErrorMessage.set(err.error?.message ?? 'No se pudo enviar el pedido. Intenta nuevamente.');
      },
    });
  }

  sendOrderByWhatsApp(): void {
    if (this.isClosed()) return;
    const restaurant = this.menu()?.restaurant;
    const phone = restaurant?.whatsapp || restaurant?.phone || '573009876543';
    const formVal = this.orderForm.value;
    const name = formVal.customerName || 'Cliente';
    const typeLabel = this.orderType() === 'DINE_IN' ? `📍 Mesa: ${formVal.tableNumber}` : this.orderType() === 'DELIVERY' ? `🛵 Domicilio: ${formVal.deliveryAddress || 'Dirección no indicada'}` : '🛍️ Para Llevar';
    const prepTime = this.estimatedPrepTime();

    let message = `¡Hola *${restaurant?.name || 'Restaurante'}*! 🍽️\n\n`;
    message += `Deseo realizar el siguiente pedido:\n`;
    message += `👤 *Cliente:* ${name}\n`;
    message += `${typeLabel}\n`;
    message += `⏱️ *Tiempo estimado de preparación:* ${prepTime}\n`;
    if (formVal.customerPhone) {
      message += `📞 *Teléfono:* ${formVal.customerPhone}\n`;
    }
    if (formVal.notes) {
      message += `📝 *Observaciones:* ${formVal.notes}\n`;
    }
    message += `\n*Detalle del Pedido:*\n`;

    this.cart().forEach((item, index) => {
      message += `${index + 1}. *${item.quantity}x ${item.productName}* - ${this.formatCurrency(item.unitPrice * item.quantity)}\n`;
      if (item.notes) {
        message += `   _Nota: ${item.notes}_\n`;
      }
    });

    message += `\n💰 *Total a Pagar:* *${this.formatCurrency(this.cartTotalAmount())}*\n\n`;
    message += `_Enviado desde el Menú Digital Tavita_ 🚀`;

    const cleanPhone = phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    // Also save to system in background so the kitchen receives it
    this.submitOrderSilently();
    
    window.open(waUrl, '_blank');
  }

  private submitOrderSilently(): void {
    const payload = {
      customerName: this.orderForm.value.customerName || 'Cliente WhatsApp',
      customerPhone: this.orderForm.value.customerPhone,
      tableNumber: this.orderForm.value.tableNumber || 'WhatsApp',
      orderType: this.orderType(),
      deliveryAddress: this.orderForm.value.deliveryAddress,
      notes: this.orderForm.value.notes,
      items: this.cart().map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      })),
    };
    const targetSlug = this.slug().trim() || this.menu()?.restaurant.slug || 'negobistro-gourmet';
    this.orderService.createPublicOrder(targetSlug, payload).subscribe({
      next: (savedOrder) => {
        this.orderSuccess.set(savedOrder);
      },
    });
  }

  closeSuccessModal(): void {
    this.orderSuccess.set(null);
  }

  // Invoice Actions
  private getInvoiceRestaurantInfo() {
    const r = this.menu()?.restaurant;
    return {
      name: r?.name || 'Restaurante Gourmet',
      slug: r?.slug || 'restaurante',
      logoUrl: r?.logoUrl,
      phone: r?.phone,
      whatsapp: r?.whatsapp,
      address: r?.address,
      taxId: r?.taxId || 'NIT: 901.458.912-4',
      estimatedPrepTime: this.estimatedPrepTime(),
    };
  }

  openInvoiceModal(order?: Order): void {
    const targetOrder = order || this.orderSuccess();
    if (targetOrder) {
      this.invoiceOrder.set(targetOrder);
      this.showInvoiceModal.set(true);
    }
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal.set(false);
  }

  downloadInvoice(order?: Order): void {
    const targetOrder = order || this.invoiceOrder() || this.orderSuccess();
    if (targetOrder) {
      this.invoiceService.downloadInvoice(targetOrder, this.getInvoiceRestaurantInfo());
    }
  }

  printInvoice(order?: Order): void {
    const targetOrder = order || this.invoiceOrder() || this.orderSuccess();
    if (targetOrder) {
      this.invoiceService.printInvoice(targetOrder, this.getInvoiceRestaurantInfo());
    }
  }

  calculateEstimatedReadyTime(createdAtIso?: string): string {
    if (!createdAtIso) return '';
    return this.invoiceService.calculateReadyTime(createdAtIso, this.estimatedPrepTime());
  }

  formatDate(isoString: string): string {
    return this.invoiceService.formatDateTime(isoString);
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
