import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';
import { unsavedChangesGuard } from './core/unsaved-changes.guard';

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
        path: 'blogs/:blogId/settings',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./blogs/blog-settings').then((m) => m.BlogSettings),
      },
      {
        path: 'blogs/:blogId/posts/:postId',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./posts/post-editor').then((m) => m.PostEditor),
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
