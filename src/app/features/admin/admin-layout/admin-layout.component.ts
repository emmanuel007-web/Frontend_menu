import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;
  readonly mobileMenuOpen = signal(false);

  readonly isSuperAdmin = computed(() => this.user()?.role === 'SUPER_ADMIN');

  readonly superNavItems = [
    { path: '/admin/super-admin/dashboard', label: 'Panel Super Admin', icon: '👑' },
    { path: '/admin/super-admin/restaurants', label: 'Restaurantes', icon: '🏢' },
    { path: '/admin/super-admin/users', label: 'Usuarios Globales', icon: '👥' },
  ];

  readonly allNavItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊', roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'RESTAURANT_USER'] },
    { path: '/admin/orders', label: 'Pedidos', icon: '📋', roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'RESTAURANT_USER'] },
    { path: '/admin/restaurant', label: 'Mi restaurante', icon: '🏪', roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'RESTAURANT_USER'] },
    { path: '/admin/categories', label: 'Categorías', icon: '🗂️', roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'RESTAURANT_USER'] },
    { path: '/admin/products', label: 'Productos', icon: '🍔', roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'RESTAURANT_USER'] },
    { path: '/admin/qr', label: 'QR del menú', icon: '🔳', roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'RESTAURANT_USER'] },
    { path: '/admin/users', label: 'Usuarios', icon: '👥', roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN'] },
    { path: '/admin/settings', label: 'Plan y suscripción', icon: '💳', roles: ['SUPER_ADMIN', 'RESTAURANT_ADMIN'] },
  ];

  readonly navItems = computed(() => {
    const role = this.user()?.role;
    if (!role) return [];
    return this.allNavItems.filter((item) => item.roles.includes(role));
  });

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  logout(): void {
    this.auth.forceLogout();
  }
}