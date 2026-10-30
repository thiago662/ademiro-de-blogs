import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { Logo } from './core/logo';
import { ThemeService } from './core/theme.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly authService = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected initial(email: string | null) {
    return (email?.[0] ?? 'V').toUpperCase();
  }

  protected async logout() {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
