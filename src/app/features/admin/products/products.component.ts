import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { FileService } from '../../../core/services/file.service';
import { Category, Product } from '../../../core/models/models';

@Component({
  selector: 'app-products',
  imports: [ReactiveFormsModule],
  templateUrl: './products.component.html',
})
export class ProductsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);
  private readonly fileService = inject(FileService);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly previewUrl = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    categoryId: [null, Validators.required],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    description: [''],
    price: [null, [Validators.required, Validators.min(0)]],
    available: [true],
  });

  ngOnInit(): void {
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        if (categories.length > 0) this.form.get('categoryId')?.setValue(categories[0]!.id);
        this.reload();
      },
      error: () => this.loading.set(false),
    });
  }

  reload(): void {
    this.loading.set(true);
    this.productService.list().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  startCreate(): void {
    this.editingId.set(-1);
    this.form.reset({
      categoryId: this.categories()[0]?.id ?? null,
      name: '',
      description: '',
      price: null,
      available: true,
    });
    this.previewUrl.set(null);
  }

  startEdit(product: Product): void {
    this.editingId.set(product.id);
    this.form.patchValue({
      categoryId: product.categoryId,
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      available: product.available,
    });
    this.previewUrl.set(product.imageUrl);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.errorMessage.set(null);
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.fileService.upload(file).subscribe({
      next: ({ url }) => {
        this.previewUrl.set(url);
        this.uploading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message ?? 'No se pudo subir la imagen');
        this.uploading.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set(null);

    const request = {
      ...this.form.value,
      imageUrl: this.previewUrl(),
    };
    const isCreate = this.editingId() === -1;
    const operation = isCreate
      ? this.productService.create(request)
      : this.productService.update(this.editingId()!, request);

    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message ?? 'No se pudo guardar el producto');
      },
    });
  }

  toggleAvailable(product: Product): void {
    this.productService
      .update(product.id, {
        categoryId: product.categoryId,
        name: product.name,
        price: product.price,
        description: product.description,
        available: !product.available,
      })
      .subscribe({ next: () => this.reload() });
  }

  remove(product: Product): void {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    this.productService.delete(product.id).subscribe({
      next: () => this.reload(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'No se pudo eliminar'),
    });
  }

  categoryName(categoryId: number): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '—';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  }
}