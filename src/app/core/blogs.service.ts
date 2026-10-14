import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { FieldDef } from './fields';
import { auth, db } from './firebase';

export interface BlogInput {
  name: string;
  slug: string;
  description: string;
  publicUrl: string;
  /** Página do workflow de deploy do site do blog (ex.: GitHub Actions), aberta pelo botão "Republicar site". */
  deployUrl: string;
  demo: boolean;
}

export interface Blog extends BlogInput {
  id: string;
  fieldDefs: FieldDef[];
  settings: Record<string, unknown>;
}

export type MemberRole = 'editor' | 'viewer';
export type BlogRole = 'admin' | MemberRole | 'guest';

export interface Member {
  uid: string;
  role: MemberRole;
  label: string;
}

// deployUrl: blogs criados antes do campo existir não o têm.
const toBlog = (snap: DocumentSnapshot) => ({ id: snap.id, deployUrl: '', ...snap.data() }) as Blog;
const byName = (a: Blog, b: Blog) => a.name.localeCompare(b.name);

@Injectable({ providedIn: 'root' })
export class BlogsService {
  private readonly authService = inject(AuthService);

  /** Admin: todos. Visitante: blogs demo. Demais: blogs onde é membro. */
  async listMine(): Promise<Blog[]> {
    const blogs = collection(db, 'blogs');
    if (await this.authService.checkAdmin()) {
      return (await getDocs(query(blogs, orderBy('name')))).docs.map(toBlog);
    }
    const user = auth.currentUser;
    if (!user) return [];
    if (user.isAnonymous) {
      return (await getDocs(query(blogs, where('demo', '==', true)))).docs.map(toBlog).sort(byName);
    }
    const memberships = await getDocs(query(collectionGroup(db, 'members'), where('uid', '==', user.uid)));
    const snaps = await Promise.all(memberships.docs.map((m) => getDoc(m.ref.parent.parent!)));
    return snaps.filter((s) => s.exists()).map(toBlog).sort(byName);
  }

  async get(id: string): Promise<Blog | null> {
    const snap = await getDoc(doc(db, 'blogs', id));
    return snap.exists() ? toBlog(snap) : null;
  }

  async roleIn(blog: Blog): Promise<BlogRole | null> {
    if (await this.authService.checkAdmin()) return 'admin';
    const user = auth.currentUser;
    if (!user) return null;
    if (user.isAnonymous) return blog.demo ? 'guest' : null;
    const member = await getDoc(doc(db, 'blogs', blog.id, 'members', user.uid));
    return member.exists() ? (member.data()['role'] as MemberRole) : null;
  }

  // ponytail: checagem sem transação; basta com 1–2 admins. Upgrade: coleção de slugs em transação.
  async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const found = await getDocs(query(collection(db, 'blogs'), where('slug', '==', slug)));
    return found.docs.some((d) => d.id !== exceptId);
  }

  async create(input: BlogInput): Promise<string> {
    const ref = await addDoc(collection(db, 'blogs'), {
      ...input,
      fieldDefs: [],
      settings: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  update(id: string, input: BlogInput) {
    return updateDoc(doc(db, 'blogs', id), { ...input, updatedAt: serverTimestamp() });
  }

  /** Só admin (rules). */
  saveFieldDefs(id: string, fieldDefs: FieldDef[]) {
    return updateDoc(doc(db, 'blogs', id), { fieldDefs, updatedAt: serverTimestamp() });
  }

  /** Admin ou editor (rules permitem ao editor alterar só settings). */
  saveSettings(id: string, settings: Record<string, unknown>) {
    return updateDoc(doc(db, 'blogs', id), { settings, updatedAt: serverTimestamp() });
  }

  // ponytail: batch único (limite 500 operações = membros + posts). Paginar se algum blog passar disso.
  async remove(id: string) {
    const batch = writeBatch(db);
    for (const sub of ['members', 'posts']) {
      (await getDocs(collection(db, 'blogs', id, sub))).docs.forEach((d) => batch.delete(d.ref));
    }
    batch.delete(doc(db, 'blogs', id));
    await batch.commit();
  }

  async listMembers(blogId: string): Promise<Member[]> {
    const snap = await getDocs(query(collection(db, 'blogs', blogId, 'members'), orderBy('label')));
    return snap.docs.map((d) => d.data() as Member);
  }

  async saveMember(blogId: string, member: Member) {
    const ref = doc(db, 'blogs', blogId, 'members', member.uid);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, { role: member.role, label: member.label });
    } else {
      await setDoc(ref, { ...member, addedAt: serverTimestamp() });
    }
  }

  removeMember(blogId: string, uid: string) {
    return deleteDoc(doc(db, 'blogs', blogId, 'members', uid));
  }
}
