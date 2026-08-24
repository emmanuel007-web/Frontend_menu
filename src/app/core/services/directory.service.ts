import { Injectable, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DirectoryRestaurant, DirectoryFilter } from '../models/models';
import { DIRECTORY_RESTAURANTS, DIRECTORY_CATEGORIES, DIRECTORY_CITIES } from '../data/directory-restaurants.data';

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly _restaurants = signal<DirectoryRestaurant[]>(DIRECTORY_RESTAURANTS);
  private readonly _filter = signal<DirectoryFilter>({
    query: '',
    cuisineCategory: 'all',
    city: 'Todas las ciudades',
    onlyOpen: false,
  });

  readonly categories = signal(DIRECTORY_CATEGORIES);
  readonly cities = signal(DIRECTORY_CITIES);
  readonly filter = this._filter.asReadonly();

  // Computed filtered list based on active filters
  readonly filteredRestaurants = computed(() => {
    const list = this._restaurants();
    const f = this._filter();
    const q = (f.query || '').trim().toLowerCase();
    const cat = f.cuisineCategory || 'all';
    const city = f.city || 'Todas las ciudades';
    const onlyOpen = !!f.onlyOpen;

    return list.filter((r) => {
      // 1. Text search
      if (q) {
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesCuisine = r.cuisine.toLowerCase().includes(q);
        const matchesCity = r.city.toLowerCase().includes(q);
        const matchesTagline = r.tagline.toLowerCase().includes(q);
        const matchesDish = r.featuredDish.toLowerCase().includes(q);
        const matchesTags = r.tags.some((t) => t.toLowerCase().includes(q));

        if (!matchesName && !matchesCuisine && !matchesCity && !matchesTagline && !matchesDish && !matchesTags) {
          return false;
        }
      }

      // 2. Cuisine category
      if (cat !== 'all' && r.cuisineCategory !== cat) {
        return false;
      }

      // 3. City
      if (city !== 'Todas las ciudades' && r.city.toLowerCase() !== city.toLowerCase()) {
        return false;
      }

      // 4. Open status
      if (onlyOpen && !r.isOpen) {
        return false;
      }

      return true;
    });
  });

  readonly totalRestaurantsCount = computed(() => this._restaurants().length);
  readonly activeResultsCount = computed(() => this.filteredRestaurants().length);

  setSearchQuery(query: string): void {
    this._filter.update((f) => ({ ...f, query }));
  }

  setCuisineCategory(cuisineCategory: string): void {
    this._filter.update((f) => ({ ...f, cuisineCategory }));
  }

  setCity(city: string): void {
    this._filter.update((f) => ({ ...f, city }));
  }

  toggleOnlyOpen(): void {
    this._filter.update((f) => ({ ...f, onlyOpen: !f.onlyOpen }));
  }

  resetFilters(): void {
    this._filter.set({
      query: '',
      cuisineCategory: 'all',
      city: 'Todas las ciudades',
      onlyOpen: false,
    });
  }

  getBySlug(slug: string): DirectoryRestaurant | undefined {
    return this._restaurants().find((r) => r.slug === slug);
  }
}
