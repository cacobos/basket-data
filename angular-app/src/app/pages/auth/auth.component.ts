import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <section class="auth-card">
        <h1>Accede a Basket Data</h1>
        <p class="muted">Accede con correo y contrasena. Te pediremos verificar email.</p>

        <div class="error" *ngIf="!auth.isConfigured()">
          La autenticacion no esta configurada en este entorno. Configura runtime-config.js.
        </div>

        <div class="tabs">
          <button class="tab" [class.active]="mode() === 'login'" (click)="mode.set('login')">
            Iniciar sesion
          </button>
          <button class="tab" [class.active]="mode() === 'register'" (click)="mode.set('register')">
            Crear cuenta
          </button>
        </div>

        <form (ngSubmit)="onSubmit()" class="form">
          <label>
            Correo
            <input
              type="email"
              required
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
              name="email"
              placeholder="tu-email@club.com"
            />
          </label>

          <label>
            Contrasena
            <input
              type="password"
              required
              minlength="6"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
              name="password"
              placeholder="Minimo 6 caracteres"
            />
          </label>

          <button class="primary" [disabled]="loading() || !email() || !password() || !auth.isConfigured()">
            {{ mode() === 'login' ? 'Entrar' : 'Crear cuenta y enviar verificacion' }}
          </button>

          <button
            type="button"
            class="link-btn"
            *ngIf="mode() === 'login'"
            [disabled]="loading() || !email() || !auth.isConfigured()"
            (click)="onResetPassword()"
          >
            He olvidado mi contrasena
          </button>
        </form>

        <div class="separator">
          <span>o</span>
        </div>

        <button
          type="button"
          class="google"
          [disabled]="loading() || !auth.isConfigured()"
          (click)="onGoogleLogin()"
        >
          Continuar con Google
        </button>

        <div class="verification" *ngIf="auth.isSignedIn() && !auth.isEmailVerified()">
          <p>Te hemos enviado un email de verificacion. Abre tu bandeja y confirma el correo.</p>
          <div class="verification-actions">
            <button class="ghost" (click)="onResendVerification()" [disabled]="loading()">
              Reenviar email
            </button>
            <button class="ghost" (click)="onRefreshUser()" [disabled]="loading()">
              Ya confirme mi correo
            </button>
          </div>
        </div>

        <p class="success" *ngIf="successMessage()">{{ successMessage() }}</p>
        <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

        <p class="helper">
          Al continuar aceptas el uso de autenticacion para proteger tus busquedas y resultados.
        </p>
        <a routerLink="/" class="back-link">Volver al inicio</a>
      </section>
    </div>
  `,
  styles: `
    .auth-page {
      min-height: 70vh;
      display: grid;
      place-items: center;
      padding: 20px;
    }

    .auth-card {
      width: 100%;
      max-width: 520px;
      background: #ffffff;
      border: 1px solid #dbe2ef;
      border-radius: 18px;
      padding: 24px;
      box-shadow: 0 14px 32px rgba(18, 28, 45, 0.08);
      display: grid;
      gap: 14px;
    }

    h1 {
      margin: 0;
      font-size: 1.7rem;
    }

    .muted {
      margin: 0;
      color: #57627a;
    }

    .primary,
    .ghost,
    .tab {
      border-radius: 10px;
      border: 1px solid #c7d2e7;
      padding: 10px 14px;
      font-weight: 600;
      cursor: pointer;
      background: white;
    }

    .primary {
      background: #0b6f7f;
      border-color: #0b6f7f;
      color: white;
    }

    .ghost {
      background: white;
    }

    .tabs {
      display: flex;
      gap: 8px;
    }

    .tab {
      flex: 1;
    }

    .tab.active {
      border-color: #0b6f7f;
      background: #e8f7f5;
      color: #0b6f7f;
    }

    .form {
      display: grid;
      gap: 12px;
    }

    label {
      display: grid;
      gap: 6px;
      font-weight: 600;
    }

    input {
      border: 1px solid #ccd7ea;
      border-radius: 10px;
      padding: 10px;
      font-size: 1rem;
    }

    .verification {
      border: 1px solid #f0d17a;
      background: #fff9e6;
      border-radius: 10px;
      padding: 12px;
      display: grid;
      gap: 8px;
    }

    .verification p {
      margin: 0;
    }

    .verification-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .success {
      color: #17623a;
      margin: 0;
      font-weight: 600;
    }

    .error {
      color: #9f2434;
      margin: 0;
      font-weight: 600;
    }

    .link-btn {
      border: 0;
      background: transparent;
      color: #0b6f7f;
      text-align: left;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
      font-weight: 600;
    }

    .helper {
      font-size: 0.9rem;
      color: #687490;
      margin: 0;
    }

    .separator {
      position: relative;
      text-align: center;
      color: #7b879f;
      font-weight: 600;
    }

    .separator::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      border-top: 1px solid #d5deed;
      transform: translateY(-50%);
    }

    .separator span {
      position: relative;
      background: #fff;
      padding: 0 10px;
    }

    .google {
      border: 1px solid #ccd7ea;
      border-radius: 10px;
      padding: 10px 14px;
      background: #fff;
      color: #1f2b43;
      font-weight: 700;
      cursor: pointer;
    }

    .back-link {
      color: #0b6f7f;
      text-decoration: none;
      font-weight: 600;
      width: fit-content;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
})
export class AuthComponent {
  readonly mode = signal<'login' | 'register'>('login');
  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async onSubmit(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      if (this.mode() === 'register') {
        await this.auth.registerWithEmail(this.email().trim(), this.password());
        this.successMessage.set('Cuenta creada. Revisa tu email para confirmar el correo.');
        return;
      }

      await this.auth.loginWithEmail(this.email().trim(), this.password());
      await this.auth.refreshUser();
      if (!this.auth.isEmailVerified()) {
        this.successMessage.set('Acceso correcto. Verifica tu correo para continuar.');
        return;
      }
      this.router.navigate(['/analyzer']);
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async onResendVerification(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      await this.auth.resendVerificationEmail();
      this.successMessage.set('Hemos reenviado el email de verificacion.');
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async onRefreshUser(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      await this.auth.refreshUser();
      if (this.auth.isEmailVerified()) {
        this.successMessage.set('Correo verificado correctamente.');
        this.router.navigate(['/analyzer']);
      } else {
        this.errorMessage.set('Tu correo aun no figura como verificado.');
      }
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async onGoogleLogin(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      await this.auth.loginWithGoogle();
      await this.auth.refreshUser();
      this.successMessage.set('Acceso con Google completado.');
      this.router.navigate(['/analyzer']);
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async onResetPassword(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      await this.auth.requestPasswordReset(this.email().trim());
      this.successMessage.set('Te hemos enviado un correo para restablecer tu contrasena.');
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (!error || typeof error !== 'object') {
      return 'Ha ocurrido un error de autenticacion.';
    }

    const message = String((error as { message?: string }).message || '').toLowerCase();
    if (message.includes('auth/invalid-credential')) {
      return 'Correo o contrasena incorrectos.';
    }
    if (message.includes('auth/email-already-in-use')) {
      return 'Ese correo ya esta registrado.';
    }
    if (message.includes('auth/weak-password')) {
      return 'La contrasena es demasiado debil.';
    }
    if (message.includes('auth/too-many-requests')) {
      return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
    }
    if (message.includes('auth/missing-email')) {
      return 'Introduce un correo para continuar.';
    }
    if (message.includes('auth/operation-not-allowed')) {
      return 'Este metodo de acceso no esta habilitado en Firebase. Activa Email/Password o Google en Authentication > Sign-in method.';
    }
    if (message.includes('auth/unauthorized-domain')) {
      return 'El dominio actual no esta autorizado en Firebase. Anade este dominio en Authentication > Settings > Authorized domains.';
    }
    if (message.includes('auth/popup-closed-by-user')) {
      return 'Has cerrado la ventana de Google antes de completar el acceso.';
    }
    if (message.includes('auth/popup-blocked')) {
      return 'El navegador ha bloqueado la ventana emergente de Google. Permite popups e intentalo de nuevo.';
    }
    if (
      message.includes('auth/invalid-continue-uri') ||
      message.includes('auth/missing-continue-uri') ||
      message.includes('auth/invalid-dynamic-link-domain')
    ) {
      return 'Firebase no puede generar correctamente el enlace de email. Revisa la configuracion de dominios y plantillas en Firebase Authentication.';
    }

    return 'No se pudo completar la autenticacion. Revisa tu configuracion de Firebase.';
  }
}
