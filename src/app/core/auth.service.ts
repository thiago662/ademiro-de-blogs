import { Injectable, computed, signal } from '@angular/core';
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(auth.currentUser);
  readonly isGuest = computed(() => this.user()?.isAnonymous ?? false);

  constructor() {
    onAuthStateChanged(auth, (user) => this.user.set(user));
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
