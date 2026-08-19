import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { roleGuard } from '../../core/guards/role.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./orders/orders.component').then((m) => m.OrdersComponent),
      },
      {
        path: 'restaurant',
        loadComponent: () => import('./restaurant/restaurant.component').then((m) => m.RestaurantComponent),
      },
      {
        path: 'categories',
        loadComponent: () => import('./categories/categories.component').then((m) => m.CategoriesComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./products/products.component').then((m) => m.ProductsComponent),
      },
      {
        path: 'qr',
        loadComponent: () => import('./qr/qr.component').then((m) => m.QrComponent),
      },
      {
        path: 'users',
        canActivate: [roleGuard('SUPER_ADMIN', 'RESTAURANT_ADMIN')],
        loadComponent: () => import('./users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'super-admin',
        canActivate: [roleGuard('SUPER_ADMIN')],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./super-admin/super-admin-dashboard.component').then((m) => m.SuperAdminDashboardComponent),
          },
          {
            path: 'restaurants',
            loadComponent: () =>
              import('./super-admin/super-admin-restaurants.component').then((m) => m.SuperAdminRestaurantsComponent),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./super-admin/super-admin-users.component').then((m) => m.SuperAdminUsersComponent),
          },
        ],
      },
    ],
  },
];