import { Injectable, computed, signal } from '@angular/core';
import { FirebaseApp, FirebaseOptions, getApps, initializeApp } from 'firebase/app';
import { RuntimeConfig } from '../runtime-config';
import {
  ActionCodeSettings,
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebaseConfig: FirebaseOptions | null = this.readFirebaseConfig();
  private readonly app: FirebaseApp | null = this.firebaseConfig
    ? (getApps()[0] ?? initializeApp(this.firebaseConfig))
    : null;
  private readonly auth: Auth | null = this.app ? getAuth(this.app) : null;
  private readonly provider = new GoogleAuthProvider();

  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  readonly isConfigured = computed(() => !!this.auth);

  readonly isSignedIn = computed(() => !!this.user());
  readonly isEmailVerified = computed(() => {
    const current = this.user();
    if (!current) {
      return false;
    }

    const hasGoogleProvider = current.providerData.some((provider) => provider?.providerId === 'google.com');
    return hasGoogleProvider || current.emailVerified;
  });

  readonly canUseApp = computed(() => this.isSignedIn() && this.isEmailVerified());

  constructor() {
    if (!this.auth) {
      this.loading.set(false);
      return;
    }

    this.auth.languageCode = 'es';

    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      this.loading.set(false);
    });
  }

  async loginWithGoogle(): Promise<void> {
    const auth = this.requireAuth();
    await signInWithPopup(auth, this.provider);
  }

  async registerWithEmail(email: string, password: string): Promise<void> {
    const auth = this.requireAuth();
    const credentials = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(credentials.user, this.getActionCodeSettings());
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    const auth = this.requireAuth();
    await signInWithEmailAndPassword(auth, email, password);
  }

  async resendVerificationEmail(): Promise<void> {
    const auth = this.requireAuth();
    const current = auth.currentUser;
    if (!current) {
      throw new Error('No hay una sesión activa.');
    }

    await sendEmailVerification(current, this.getActionCodeSettings());
  }

  async requestPasswordReset(email: string): Promise<void> {
    const auth = this.requireAuth();
    await sendPasswordResetEmail(auth, email, this.getActionCodeSettings());
  }

  async refreshUser(): Promise<void> {
    const auth = this.requireAuth();
    const current = auth.currentUser;
    if (!current) {
      this.user.set(null);
      return;
    }

    await current.reload();
    this.user.set(auth.currentUser);
  }

  async getIdToken(forceRefresh = false): Promise<string | null> {
    if (!this.auth) {
      return null;
    }

    const auth = this.auth;
    const current = auth.currentUser;
    if (!current) {
      return null;
    }

    return current.getIdToken(forceRefresh);
  }

  async logout(): Promise<void> {
    const auth = this.requireAuth();
    await signOut(auth);
  }

  private readFirebaseConfig(): FirebaseOptions | null {
    const runtime = window.__BASKET_DATA_CONFIG__ || {};
    const apiKey = (runtime.firebaseApiKey || '').trim();
    const authDomain = (runtime.firebaseAuthDomain || '').trim();
    const projectId = (runtime.firebaseProjectId || '').trim();
    const appId = (runtime.firebaseAppId || '').trim();

    if (!apiKey || !authDomain || !projectId || !appId) {
      return null;
    }

    return {
      apiKey,
      authDomain,
      projectId,
      appId,
    };
  }

  private requireAuth(): Auth {
    if (!this.auth) {
      throw new Error('La autenticacion no esta configurada. Revisa runtime-config.js.');
    }

    return this.auth;
  }

  private getActionCodeSettings(): ActionCodeSettings {
    return {
      // Fuerza a Firebase a incluir un continueUrl del dominio actual.
      // Si el dominio no esta autorizado en Firebase, devolvera un error explicito.
      url: `${window.location.origin}/acceso`,
      handleCodeInApp: false,
    };
  }
}
