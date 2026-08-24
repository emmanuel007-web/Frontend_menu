import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AdminUser } from '../../../core/models/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-super-admin-users',
  imports: [DatePipe, RouterLink],
  templateUrl: './super-admin-users.component.html',
})
export class SuperAdminUsersComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly auth = inject(AuthService);

  readonly currentUser = this.auth.user;
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly searchTerm = signal('');
  readonly loadError = signal<string | null>(null);

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.users();
    return this.users().filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term) ||
        (u.restaurantName && u.restaurantName.toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.adminService.listUsers().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(
          err.status === 401 || err.status === 403
            ? 'Tu sesión no tiene permisos de Super Admin. Vuelve a iniciar sesión con la cuenta correcta.'
            : 'No se pudieron cargar los usuarios. Verifica tu conexión e inténtalo de nuevo.'
        );
      },
    });
  }

  toggleActive(user: AdminUser): void {
    if (this.currentUser()?.id === user.id && user.active) {
      alert('No puedes desactivarte a ti mismo.');
      return;
    }
    const newStatus = !user.active;
    this.adminService.toggleUserActive(user.id, newStatus).subscribe({
      next: () => {
        this.users.update((list) =>
          list.map((item) => (item.id === user.id ? { ...item, active: newStatus } : item))
        );
      },
    });
  }
}
