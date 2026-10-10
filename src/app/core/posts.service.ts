import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export type PostStatus = 'draft' | 'published' | 'archived';

export interface PostInput {
  title: string;
  subtitle: string;
  summary: string;
  slug: string;
  coverUrl: string;
  body: string;
  tags: string[];
  status: PostStatus;
}

export interface Post extends PostInput {
  id: string;
  custom: Record<string, unknown>;
  extras: unknown[];
  authorUid: string;
  updatedAt: Timestamp | null;
  publishedAt: Timestamp | null;
}

const toPost = (snap: DocumentSnapshot) => ({ id: snap.id, ...snap.data() }) as Post;
const posts = (blogId: string) => collection(db, 'blogs', blogId, 'posts');

@Injectable({ providedIn: 'root' })
export class PostsService {
  async list(blogId: string): Promise<Post[]> {
    return (await getDocs(query(posts(blogId), orderBy('updatedAt', 'desc')))).docs.map(toPost);
  }

  async get(blogId: string, id: string): Promise<Post | null> {
    const snap = await getDoc(doc(posts(blogId), id));
    return snap.exists() ? toPost(snap) : null;
  }

  // ponytail: checagem sem transação; basta com poucos editores. Upgrade: coleção de slugs em transação.
  async slugTaken(blogId: string, slug: string, exceptId?: string): Promise<boolean> {
    const found = await getDocs(query(posts(blogId), where('slug', '==', slug)));
    return found.docs.some((d) => d.id !== exceptId);
  }

  async create(blogId: string, input: PostInput): Promise<string> {
    const ref = await addDoc(posts(blogId), {
      ...input,
      custom: {},
      extras: [],
      authorUid: auth.currentUser!.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: input.status === 'published' ? serverTimestamp() : null,
    });
    return ref.id;
  }

  /** publishedAt guarda a primeira publicação; editar depois não muda a data. */
  update(blogId: string, current: Post, input: PostInput) {
    const publishedAt =
      input.status === 'published' && !current.publishedAt ? serverTimestamp() : current.publishedAt;
    return updateDoc(doc(posts(blogId), current.id), { ...input, publishedAt, updatedAt: serverTimestamp() });
  }

  remove(blogId: string, id: string) {
    return deleteDoc(doc(posts(blogId), id));
  }
}
