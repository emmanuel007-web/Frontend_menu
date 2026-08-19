import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly restaurantService = inject(RestaurantService);
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly restaurantName = signal<string | null>(null);
  readonly menuSlug = signal<string | null>(null);
  readonly categoryCount = signal(0);
  readonly productCount = signal(0);
  readonly availableCount = signal(0);
  readonly planName = signal<string | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.restaurantService.getMine().subscribe({
      next: (r) => {
        this.restaurantName.set(r.name);
        this.menuSlug.set(r.slug);
      },
    });

    this.categoryService.list(0, 100).subscribe({
      next: (categories) => this.categoryCount.set(categories.totalElements),
    });

    this.productService.list(undefined, 0, 100).subscribe({
      next: (products) => {
        this.productCount.set(products.totalElements);
        this.availableCount.set(products.content.filter((p) => p.available).length);
      },
    });

    this.subscriptionService.getMine().subscribe({
      next: (s) => this.planName.set(s.plan.name),
      error: () => undefined,
      complete: () => this.loading.set(false),
    });
  }
}