import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Blog, BlogRole, BlogsService } from '../core/blogs.service';
import { Post, PostStatus, PostsService } from '../core/posts.service';

const roleLabels: Record<BlogRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Somente leitura',
  guest: 'Visitante',
};

const statusLabels: Record<PostStatus, { label: string; css: string }> = {
  draft: { label: 'Rascunho', css: 'text-bg-warning' },
  published: { label: 'Publicado', css: 'text-bg-success' },
  archived: { label: 'Arquivado', css: 'text-bg-secondary' },
};

@Component({
  selector: 'app-blog-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './blog-detail.html',
})
export class BlogDetail implements OnInit {
  private readonly blogsService = inject(BlogsService);
  private readonly postsService = inject(PostsService);

  readonly blogId = input.required<string>();

  protected readonly blog = signal<Blog | null>(null);
  protected readonly role = signal<BlogRole | null>(null);
  protected readonly posts = signal<Post[] | null>(null);
  protected readonly statusFilter = signal<PostStatus | ''>('');
  protected readonly notFound = signal(false);
  protected readonly roleLabels = roleLabels;
  protected readonly statusLabels = statusLabels;

  protected readonly canWrite = computed(() => this.role() === 'admin' || this.role() === 'editor');
  protected readonly filteredPosts = computed(() => {
    const status = this.statusFilter();
    return (this.posts() ?? []).filter((p) => !status || p.status === status);
  });

  async ngOnInit() {
    const blog = await this.blogsService.get(this.blogId());
    if (!blog) {
      this.notFound.set(true);
      return;
    }
    this.role.set(await this.blogsService.roleIn(blog));
    this.blog.set(blog);
    this.posts.set(await this.postsService.list(blog.id));
  }
}
