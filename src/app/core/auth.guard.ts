import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { auth } from './firebase';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  await auth.authStateReady();
  return auth.currentUser ? true : router.createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  return (await authService.checkAdmin()) ? true : router.createUrlTree(['/']);
};
