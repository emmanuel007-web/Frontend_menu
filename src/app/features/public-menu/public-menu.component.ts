import { Component, effect, inject, input, signal } from '@angular/core';
import { MenuService } from '../../core/services/menu.service';
import { PublicMenu } from '../../core/models/models';

@Component({
  selector: 'app-public-menu',
  templateUrl: './public-menu.component.html',
})
export class PublicMenuComponent {
  private readonly menuService = inject(MenuService);

  readonly slug = input<string>('');

  readonly menu = signal<PublicMenu | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly activeCategory = signal<number | null>(null);

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

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  }
}