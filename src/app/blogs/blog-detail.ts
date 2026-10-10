import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Blog, BlogRole, BlogsService } from '../core/blogs.service';

const roleLabels: Record<BlogRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Somente leitura',
  guest: 'Visitante',
};

@Component({
  selector: 'app-blog-detail',
  imports: [RouterLink],
  templateUrl: './blog-detail.html',
})
export class BlogDetail implements OnInit {
  private readonly blogsService = inject(BlogsService);

  readonly blogId = input.required<string>();

  protected readonly blog = signal<Blog | null>(null);
  protected readonly role = signal<BlogRole | null>(null);
  protected readonly notFound = signal(false);
  protected readonly roleLabels = roleLabels;

  async ngOnInit() {
    const blog = await this.blogsService.get(this.blogId());
    if (!blog) {
      this.notFound.set(true);
      return;
    }
    this.role.set(await this.blogsService.roleIn(blog));
    this.blog.set(blog);
  }
}
