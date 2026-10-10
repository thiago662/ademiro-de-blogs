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
import { auth, db } from './firebase';

export interface BlogInput {
  name: string;
  slug: string;
  description: string;
  publicUrl: string;
  demo: boolean;
}

export interface Blog extends BlogInput {
  id: string;
  fieldDefs: unknown[];
  settings: Record<string, unknown>;
}

export type MemberRole = 'editor' | 'viewer';
export type BlogRole = 'admin' | MemberRole | 'guest';

export interface Member {
  uid: string;
  role: MemberRole;
  label: string;
}

const toBlog = (snap: DocumentSnapshot) => ({ id: snap.id, ...snap.data() }) as Blog;
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

  // ponytail: batch único (limite 500 operações). Fase 3 inclui posts aqui; paginar se passar disso.
  async remove(id: string) {
    const batch = writeBatch(db);
    const members = await getDocs(collection(db, 'blogs', id, 'members'));
    members.docs.forEach((m) => batch.delete(m.ref));
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
