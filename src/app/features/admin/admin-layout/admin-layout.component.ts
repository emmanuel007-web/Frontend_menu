import { Component, inject, signal } from '@angular/core';
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

  readonly navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/restaurant', label: 'Mi restaurante', icon: '🏪' },
    { path: '/admin/categories', label: 'Categorías', icon: '🗂️' },
    { path: '/admin/products', label: 'Productos', icon: '🍔' },
    { path: '/admin/qr', label: 'QR del menú', icon: '🔳' },
    { path: '/admin/users', label: 'Usuarios', icon: '👥' },
    { path: '/admin/settings', label: 'Plan y suscripción', icon: '💳' },
  ];

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