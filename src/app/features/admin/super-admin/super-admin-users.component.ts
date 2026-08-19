import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AdminUser } from '../../../core/models/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-super-admin-users',
  imports: [DatePipe],
  templateUrl: './super-admin-users.component.html',
})
export class SuperAdminUsersComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly auth = inject(AuthService);

  readonly currentUser = this.auth.user;
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly searchTerm = signal('');

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
    this.adminService.listUsers().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
