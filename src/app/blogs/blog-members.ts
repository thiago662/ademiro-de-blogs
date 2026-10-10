import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Blog, BlogsService, Member, MemberRole } from '../core/blogs.service';

@Component({
  selector: 'app-blog-members',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './blog-members.html',
})
export class BlogMembers implements OnInit {
  private readonly blogsService = inject(BlogsService);

  readonly blogId = input.required<string>();

  protected readonly blog = signal<Blog | null>(null);
  protected readonly members = signal<Member[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly form = new FormGroup({
    uid: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(128)] }),
    label: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    role: new FormControl<MemberRole>('viewer', { nonNullable: true }),
  });

  async ngOnInit() {
    this.blog.set(await this.blogsService.get(this.blogId()));
    await this.reload();
  }

  protected add() {
    const member = this.form.getRawValue();
    member.uid = member.uid.trim();
    return this.run(async () => {
      await this.blogsService.saveMember(this.blogId(), member);
      this.form.reset();
    });
  }

  protected changeRole(member: Member, role: string) {
    return this.run(() => this.blogsService.saveMember(this.blogId(), { ...member, role: role as MemberRole }));
  }

  protected remove(member: Member) {
    if (!confirm(`Remover ${member.label || member.uid} deste blog?`)) return;
    return this.run(() => this.blogsService.removeMember(this.blogId(), member.uid));
  }

  private async reload() {
    this.members.set(await this.blogsService.listMembers(this.blogId()));
  }

  private async run(action: () => Promise<void>) {
    this.loading.set(true);
    this.error.set('');
    try {
      await action();
      await this.reload();
    } catch {
      this.error.set('Não foi possível salvar o membro.');
    } finally {
      this.loading.set(false);
    }
  }
}
