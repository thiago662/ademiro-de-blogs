import { Injectable, computed, signal } from '@angular/core';
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(auth.currentUser);
  readonly isGuest = computed(() => this.user()?.isAnonymous ?? false);
  readonly isAdmin = signal(false);

  constructor() {
    onAuthStateChanged(auth, async (user) => {
      this.user.set(user);
      this.isAdmin.set(await this.checkAdmin());
    });
  }

  /** Consulta a allowlist. As rules são a proteção real; isto só decide o que a UI mostra. */
  async checkAdmin(): Promise<boolean> {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user || user.isAnonymous) return false;
    try {
      return (await getDoc(doc(db, 'admins', user.uid))).exists();
    } catch {
      return false;
    }
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  loginAsGuest() {
    return signInAnonymously(auth);
  }

  logout() {
    // Visitante anônimo é descartável: apagar evita acumular contas no Auth.
    return auth.currentUser?.isAnonymous ? auth.currentUser.delete() : signOut(auth);
  }
}
