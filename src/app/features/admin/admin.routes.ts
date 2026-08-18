import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';

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
        loadComponent: () => import('./users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
];