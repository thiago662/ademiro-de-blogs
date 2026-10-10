import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./blogs/blog-list').then((m) => m.BlogList) },
      {
        path: 'blogs/new',
        canActivate: [adminGuard],
        loadComponent: () => import('./blogs/blog-form').then((m) => m.BlogForm),
      },
      { path: 'blogs/:blogId', loadComponent: () => import('./blogs/blog-detail').then((m) => m.BlogDetail) },
      {
        path: 'blogs/:blogId/edit',
        canActivate: [adminGuard],
        loadComponent: () => import('./blogs/blog-form').then((m) => m.BlogForm),
      },
      {
        path: 'blogs/:blogId/members',
        canActivate: [adminGuard],
        loadComponent: () => import('./blogs/blog-members').then((m) => m.BlogMembers),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
