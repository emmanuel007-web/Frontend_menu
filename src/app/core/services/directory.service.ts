import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { DirectoryRestaurant, DirectoryFilter } from '../models/models';

const ALL_CATEGORY = { id: 'all', name: 'Todos', icon: '🍽️' };

/**
 * Directorio publico de restaurantes (modulo Explore).
 * Consume /public/restaurants: datos reales de la base de datos.
 * Los filtros se aplican en cliente sobre la lista cargada.
 */
@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly api: ApiService;
  private readonly _restaurants = signal<DirectoryRestaurant[]>([]);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly categories = signal([ALL_CATEGORY]);
  readonly cities = signal(['Todas las ciudades']);
  readonly filter = signal<DirectoryFilter>({
    query: '',
    cuisineCategory: 'all',
    city: 'Todas las ciudades',
    onlyOpen: false,
  });

  readonly filteredRestaurants = computed(() => {
    const list = this._restaurants();
    const f = this.filter();
    const q = (f.query || '').trim().toLowerCase();
    const cat = f.cuisineCategory || 'all';
    const city = f.city || 'Todas las ciudades';
    const onlyOpen = !!f.onlyOpen;

    return list.filter((r) => {
      if (q) {
        const haystack = [
          r.name,
          r.description,
          r.address || '',
          ...(r.tags ?? []),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (cat !== 'all' && r.cuisineCategory !== cat) return false;
      if (city !== 'Todas las ciudades' && (r.city || '') !== city) return false;
      if (onlyOpen && r.isOpen === false) return false;
      return true;
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
        this._restaurants.set(list.map((r) => this.enrich(r)));
        this.cities.set(this.deriveCities(this._restaurants()));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(
          'No se pudieron cargar los restaurantes. Verifica tu conexión e inténtalo de nuevo.'
        );
      },
    });
  }

  /**
   * Deriva los campos decorativos que la BD aun no tiene, para que la
   * interfaz pueda ocultarlos limpiamente (@if en el template).
   */
  private enrich(r: DirectoryRestaurant): DirectoryRestaurant {
    return {
      ...r,
      tagline: r.description?.slice(0, 120) || '',
      city: this.deriveCity(r.address),
      isOpen: true,
      tags: [],
      coverUrl: r.logoUrl || null,
      rating: undefined,
      reviewCount: undefined,
      priceLevel: undefined,
      deliveryTime: undefined,
      featuredDish: undefined,
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

  toggleOnlyOpen(): void {
    this.filter.update((f) => ({ ...f, onlyOpen: !f.onlyOpen }));
  }

  resetFilters(): void {
    this.filter.set({
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
