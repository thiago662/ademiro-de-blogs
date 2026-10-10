import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Blog, BlogsService } from '../core/blogs.service';

@Component({
  selector: 'app-blog-list',
  imports: [RouterLink],
  templateUrl: './blog-list.html',
})
export class BlogList implements OnInit {
  private readonly blogsService = inject(BlogsService);
  protected readonly authService = inject(AuthService);

  protected readonly blogs = signal<Blog[] | null>(null);
  protected readonly error = signal('');

  async ngOnInit() {
    try {
      this.blogs.set(await this.blogsService.listMine());
    } catch {
      this.error.set('Não foi possível carregar os blogs.');
    }
  }
}
