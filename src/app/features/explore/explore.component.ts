import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { DirectoryService } from '../../core/services/directory.service';
import { AuthService } from '../../core/services/auth.service';
import { DirectoryRestaurant } from '../../core/models/models';

@Component({
  selector: 'app-explore',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './explore.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExploreComponent {
  readonly directoryService = inject(DirectoryService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly searchControl = new FormControl('');
  readonly selectedCity = signal('Todas las ciudades');

  // Signals from DirectoryService
  readonly restaurants = this.directoryService.filteredRestaurants;
  readonly categories = this.directoryService.categories;
  readonly cities = this.directoryService.cities;
  readonly filter = this.directoryService.filter;
  readonly totalCount = this.directoryService.totalRestaurantsCount;
  readonly activeCount = this.directoryService.activeResultsCount;
  readonly loading = this.directoryService.loading;
  readonly loadError = this.directoryService.loadError;

  // Auth info
  readonly currentUser = this.authService.user;
  readonly isAuthenticated = this.authService.isAuthenticated;

  // Selected quick view restaurant modal (for instant price & dish preview without leaving explore)
  readonly quickViewRestaurant = signal<DirectoryRestaurant | null>(null);

  constructor() {
    this.searchControl.valueChanges.subscribe((val) => {
      this.directoryService.setSearchQuery(val || '');
    });
  }

  onSelectCategory(categoryId: string): void {
    this.directoryService.setCuisineCategory(categoryId);
  }

  onSelectCity(city: string): void {
    this.selectedCity.set(city);
    this.directoryService.setCity(city);
  }

  onSelectPriceLevel(level: string): void {
    this.directoryService.setPriceLevel(level);
  }

  onSelectSort(sort: 'recommended' | 'priceAsc' | 'priceDesc' | 'rating'): void {
    this.directoryService.setSortBy(sort);
  }

  onToggleOpenOnly(): void {
    this.directoryService.toggleOnlyOpen();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.directoryService.setSearchQuery('');
  }

  resetAllFilters(): void {
    this.searchControl.setValue('');
    this.selectedCity.set('Todas las ciudades');
    this.directoryService.resetFilters();
  }

  retryLoad(): void {
    this.directoryService.load();
  }

  openMenu(slug: string): void {
    this.router.navigate(['/menu', slug]);
  }

  openQuickView(r: DirectoryRestaurant, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.quickViewRestaurant.set(r);
  }

  closeQuickView(): void {
    this.quickViewRestaurant.set(null);
  }

  formatCurrency(val: number | undefined): string {
    if (val === undefined || val === null) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  }

  openWhatsApp(phone: string, name: string): void {
    const clean = phone.replace(/\D/g, '');
    const msg = `¡Hola ${name}! Vi su restaurante en el directorio de Tavita y me gustaría consultar su menú de hoy.`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  }
}
