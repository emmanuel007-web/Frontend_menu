import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AdminRestaurant } from '../../../core/models/models';

@Component({
  selector: 'app-super-admin-restaurants',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './super-admin-restaurants.component.html',
})
export class SuperAdminRestaurantsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly restaurants = signal<AdminRestaurant[]>([]);
  readonly loading = signal(true);
  readonly searchTerm = signal('');
  readonly showModal = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    restaurantName: ['', [Validators.required, Validators.maxLength(120)]],
    slug: [
      '',
      [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), Validators.maxLength(120)],
    ],
    adminName: ['', [Validators.required, Validators.maxLength(120)]],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
      ],
    ],
    planCode: ['PRO', Validators.required],
  });

  readonly filteredRestaurants = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.restaurants();
    return this.restaurants().filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.slug.toLowerCase().includes(term) ||
        (r.adminEmail && r.adminEmail.toLowerCase().includes(term)) ||
        (r.planName && r.planName.toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.loadRestaurants();
  }

  loadRestaurants(): void {
    this.loading.set(true);
    this.adminService.listRestaurants().subscribe({
      next: (list) => {
        this.restaurants.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  suggestSlug(): void {
    const name = this.form.get('restaurantName')?.value ?? '';
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (slug) this.form.get('slug')?.setValue(slug);
  }

  openCreateModal(): void {
    this.form.reset({ planCode: 'PRO' });
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitCreate(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.adminService.createRestaurant(this.form.value).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showModal.set(false);
        this.loadRestaurants();
      },
      error: (err) => {
        this.submitting.set(false);
        const fieldErrors = err.error?.fieldErrors;
        if (fieldErrors && Object.keys(fieldErrors).length > 0) {
          const firstKey = Object.keys(fieldErrors)[0];
          this.errorMessage.set(fieldErrors[firstKey]);
        } else {
          this.errorMessage.set(err.error?.message ?? 'No se pudo crear el restaurante');
        }
      },
    });
  }

  toggleActive(restaurant: AdminRestaurant): void {
    const newStatus = !restaurant.active;
    this.adminService.toggleRestaurantActive(restaurant.id, newStatus).subscribe({
      next: () => {
        this.restaurants.update((list) =>
          list.map((item) => (item.id === restaurant.id ? { ...item, active: newStatus } : item))
        );
      },
    });
  }
}
