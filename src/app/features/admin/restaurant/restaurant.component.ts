import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { FileService } from '../../../core/services/file.service';
import { Restaurant } from '../../../core/models/models';

@Component({
  selector: 'app-restaurant',
  imports: [ReactiveFormsModule],
  templateUrl: './restaurant.component.html',
})
export class RestaurantComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly restaurantService = inject(RestaurantService);
  private readonly fileService = inject(FileService);

  readonly restaurant = signal<Restaurant | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly togglingOpen = signal(false);
  readonly message = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    description: [''],
    phone: [''],
    address: [''],
    whatsapp: [''],
    instagram: [''],
    facebook: [''],
    taxId: [''],
    estimatedPrepTime: ['20-30 min', [Validators.required]],
  });

  ngOnInit(): void {
    this.restaurantService.getMine().subscribe({
      next: (restaurant) => {
        this.restaurant.set(restaurant);
        this.form.patchValue({
          name: restaurant.name,
          slug: restaurant.slug,
          description: restaurant.description ?? '',
          phone: restaurant.phone ?? '',
          address: restaurant.address ?? '',
          whatsapp: restaurant.whatsapp ?? '',
          instagram: restaurant.instagram ?? '',
          facebook: restaurant.facebook ?? '',
          taxId: restaurant.taxId ?? '',
          estimatedPrepTime: restaurant.estimatedPrepTime ?? '20-30 min',
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.fileService.upload(file).subscribe({
      next: ({ url }) => {
        const restaurant = this.restaurant();
        if (restaurant) this.restaurant.set({ ...restaurant, logoUrl: url });
        this.message.set({ type: 'success', text: 'Logo subido correctamente' });
        this.uploading.set(false);
      },
      error: (err) => {
        this.message.set({ type: 'error', text: err.error?.message ?? 'No se pudo subir el logo' });
        this.uploading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.message.set(null);

    this.restaurantService.updateMine(this.form.value).subscribe({
      next: (restaurant) => {
        this.restaurant.set(restaurant);
        this.saving.set(false);
        this.message.set({ type: 'success', text: 'Restaurante actualizado' });
      },
      error: (err) => {
        this.saving.set(false);
        this.message.set({ type: 'error', text: err.error?.message ?? 'No se pudo guardar' });
      },
    });
  }

  toggleOpen(): void {
    const restaurant = this.restaurant();
    if (!restaurant || this.togglingOpen()) return;
    this.togglingOpen.set(true);
    this.message.set(null);

    this.restaurantService.setOpen(!restaurant.open).subscribe({
      next: (updated) => {
        this.restaurant.set(updated);
        this.togglingOpen.set(false);
        this.message.set({
          type: 'success',
          text: updated.open
            ? 'Restaurante ABIERTO: ya puedes recibir pedidos'
            : 'Restaurante CERRADO: los clientes no pueden hacer pedidos',
        });
      },
      error: (err) => {
        this.togglingOpen.set(false);
        this.message.set({ type: 'error', text: err.error?.message ?? 'No se pudo cambiar el estado' });
      },
    });
  }
}