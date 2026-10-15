import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { AuthService } from '../core/auth.service';

const errorMessages: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/network-request-failed': 'Sem conexão com o servidor.',
  'auth/admin-restricted-operation': 'Acesso de visitante desativado.',
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected submit() {
    const { email, password } = this.form.getRawValue();
    this.run(() => this.authService.login(email, password));
  }

  protected enterAsGuest() {
    this.run(() => this.authService.loginAsGuest());
  }

  private async run(action: () => Promise<unknown>) {
    this.loading.set(true);
    this.error.set('');
    try {
      await action();
      await this.router.navigateByUrl('/');
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : '';
      this.error.set(errorMessages[code] ?? 'Não foi possível entrar.');
    } finally {
      this.loading.set(false);
    }
  }
}
