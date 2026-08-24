import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { DirectoryService } from '../../core/services/directory.service';
import { DirectoryRestaurant } from '../../core/models/models';

@Component({
  selector: 'app-explore',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './explore.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExploreComponent {
  readonly directoryService = inject(DirectoryService);
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

  openMenu(slug: string): void {
    this.router.navigate(['/menu', slug]);
  }

  openWhatsApp(phone: string, name: string): void {
    const clean = phone.replace(/\D/g, '');
    const msg = `¡Hola ${name}! Vi su restaurante en el directorio de Tavita y me gustaría hacer una consulta sobre el menú.`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  }
}
