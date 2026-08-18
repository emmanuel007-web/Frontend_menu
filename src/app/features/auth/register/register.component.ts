import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      restaurantName: ['', [Validators.required, Validators.maxLength(120)]],
      slug: [
        '',
        [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), Validators.maxLength(120)],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: (g) => (g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true }) },
  );

  loading = false;
  errorMessage: string | null = null;

  /** Slug autocompletado a partir del nombre del restaurante. */
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

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.errorMessage = null;

    this.auth
      .register({
        name: this.form.value.name,
        email: this.form.value.email,
        password: this.form.value.password,
        restaurantName: this.form.value.restaurantName,
        slug: this.form.value.slug,
      })
      .subscribe({
        next: () => this.router.navigate(['/admin']),
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message ?? 'No se pudo completar el registro';
        },
      });
  }
}