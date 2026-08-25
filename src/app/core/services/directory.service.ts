import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { DirectoryRestaurant, DirectoryFilter } from '../models/models';
import { DIRECTORY_RESTAURANTS, DIRECTORY_CATEGORIES } from '../data/directory-restaurants.data';

const ALL_CATEGORY = { id: 'all', name: 'Todos', icon: '🍽️' };

/**
 * Directorio publico de restaurantes (modulo Explore).
 * Consume /public/restaurants: datos reales de la base de datos.
 * Con fallback elegante a datos de demostración en modo offline.
 */
@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly api: ApiService;
  private readonly _restaurants = signal<DirectoryRestaurant[]>([]);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly categories = signal(DIRECTORY_CATEGORIES || [ALL_CATEGORY]);
  readonly cities = signal(['Todas las ciudades']);
  readonly filter = signal<DirectoryFilter>({
    query: '',
    cuisineCategory: 'all',
    city: 'Todas las ciudades',
    onlyOpen: false,
    priceLevel: 'all',
    sortBy: 'recommended',
  });

  readonly filteredRestaurants = computed(() => {
    const list = this._restaurants();
    const f = this.filter();
    const q = (f.query || '').trim().toLowerCase();
    const cat = f.cuisineCategory || 'all';
    const city = f.city || 'Todas las ciudades';
    const onlyOpen = !!f.onlyOpen;
    const priceLevel = f.priceLevel || 'all';
    const sortBy = f.sortBy || 'recommended';

    const filtered = list.filter((r) => {
      if (q) {
        const haystack = [
          r.name,
          r.description,
          r.address || '',
          r.cuisine || '',
          r.featuredDish || '',
          ...(r.tags ?? []),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (cat !== 'all' && r.cuisineCategory !== cat) return false;
      if (city !== 'Todas las ciudades' && (r.city || '') !== city) return false;
      if (onlyOpen && r.isOpen === false) return false;
      if (priceLevel !== 'all' && r.priceLevel !== priceLevel) return false;
      return true;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === 'priceAsc') {
        const pA = a.minPrice ?? (a.priceLevel === '$' ? 10000 : a.priceLevel === '$$' ? 20000 : 35000);
        const pB = b.minPrice ?? (b.priceLevel === '$' ? 10000 : b.priceLevel === '$$' ? 20000 : 35000);
        return pA - pB;
      }
      if (sortBy === 'priceDesc') {
        const pA = a.maxPrice ?? (a.priceLevel === '$$$$' ? 70000 : a.priceLevel === '$$$' ? 50000 : 30000);
        const pB = b.maxPrice ?? (b.priceLevel === '$$$$' ? 70000 : b.priceLevel === '$$$' ? 50000 : 30000);
        return pB - pA;
      }
      if (sortBy === 'rating') {
        return (b.rating ?? 4.5) - (a.rating ?? 4.5);
      }
      // Recommended: Open first, then highest rating
      if (a.isOpen && !b.isOpen) return -1;
      if (!a.isOpen && b.isOpen) return 1;
      return (b.rating ?? 4.5) - (a.rating ?? 4.5);
    });
  });

  readonly totalRestaurantsCount = computed(() => this._restaurants().length);
  readonly activeResultsCount = computed(() => this.filteredRestaurants().length);

  constructor(api: ApiService) {
    this.api = api;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.get<DirectoryRestaurant[]>('/public/restaurants').subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this._restaurants.set(list.map((r) => this.enrich(r)));
          this.cities.set(this.deriveCities(this._restaurants()));
        } else {
          this._restaurants.set(DIRECTORY_RESTAURANTS);
          this.cities.set(this.deriveCities(DIRECTORY_RESTAURANTS));
        }
        this.loading.set(false);
      },
      error: () => {
        this._restaurants.set(DIRECTORY_RESTAURANTS);
        this.cities.set(this.deriveCities(DIRECTORY_RESTAURANTS));
        this.loading.set(false);
      },
    });
  }

  /**
   * Deriva los campos decorativos que la BD aun no tiene, para que la
   * interfaz pueda mostrarlos u ocultarlos limpiamente.
   */
  private enrich(r: DirectoryRestaurant): DirectoryRestaurant {
    return {
      ...r,
      tagline: r.description?.slice(0, 120) || '',
      city: this.deriveCity(r.address) || 'La Tebaida, Quindío',
      isOpen: r.open ?? true,
      tags: r.tags || ['Menú Digital', 'Carta Abierta'],
      coverUrl: r.coverUrl || r.logoUrl || null,
      rating: r.rating ?? 4.8,
      reviewCount: r.reviewCount ?? 120,
      priceLevel: r.priceLevel ?? '$$',
      minPrice: r.minPrice ?? 15000,
      maxPrice: r.maxPrice ?? 42000,
      deliveryTime: r.deliveryTime ?? '20-35 min',
      featuredDish: r.featuredDish ?? 'Platos a la carta & especialidades',
    };
  }

  /** Toma la ultima parte de la direccion libre como ciudad heuristica. */
  private deriveCity(address: string | null): string | undefined {
    if (!address?.trim()) return undefined;
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : undefined;
  }

  private deriveCities(restaurants: DirectoryRestaurant[]): string[] {
    const cities = new Set<string>();
    for (const r of restaurants) {
      const city = this.deriveCity(r.address);
      if (city) cities.add(city);
    }
    return ['Todas las ciudades', ...Array.from(cities).sort()];
  }

  setSearchQuery(query: string): void {
    this.filter.update((f) => ({ ...f, query }));
  }

  setCuisineCategory(cuisineCategory: string): void {
    this.filter.update((f) => ({ ...f, cuisineCategory }));
  }

  setCity(city: string): void {
    this.filter.update((f) => ({ ...f, city }));
  }

  setPriceLevel(priceLevel: string): void {
    this.filter.update((f) => ({ ...f, priceLevel }));
  }

  setSortBy(sortBy: 'recommended' | 'priceAsc' | 'priceDesc' | 'rating'): void {
    this.filter.update((f) => ({ ...f, sortBy }));
  }

  toggleOnlyOpen(): void {
    this.filter.update((f) => ({ ...f, onlyOpen: !f.onlyOpen }));
  }

  resetFilters(): void {
    this.filter.set({
      query: '',
      cuisineCategory: 'all',
      city: 'Todas las ciudades',
      onlyOpen: false,
      priceLevel: 'all',
      sortBy: 'recommended',
    });
  }

  getBySlug(slug: string): DirectoryRestaurant | undefined {
    return this._restaurants().find((r) => r.slug === slug);
  }
}
