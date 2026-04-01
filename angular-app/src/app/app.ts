import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <div class="app-root">
      <nav class="navbar">
        <div class="nav-container">
          <a routerLink="/" class="logo">
            <img src="/logo.png" alt="Basket Data" />
            <span>Basket Data</span>
          </a>
          <div class="nav-links">
            <a
              routerLink="/"
              class="nav-link"
              routerLinkActive="active"
              routerLinkActiveOptions="{exact: true}"
            >
              Inicio
            </a>
            <a routerLink="/analyzer" class="nav-link" routerLinkActive="active"> Nueva busqueda </a>
            <a routerLink="/busquedas" class="nav-link" routerLinkActive="active"> Busquedas </a>
            <a routerLink="/en-vivo" class="nav-link" routerLinkActive="active"> En vivo </a>
          </div>

          <div class="auth-actions">
            <a *ngIf="!auth.isSignedIn()" routerLink="/acceso" class="auth-link">Acceder</a>
            <button *ngIf="auth.isSignedIn()" class="auth-logout" (click)="logout()">
              Cerrar sesion
            </button>
          </div>
        </div>
      </nav>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <footer class="footer">
        <p>&copy; 2026 Basket Data. Scouting FEB compartido con retencion automatica de 24h.</p>
      </footer>
    </div>
  `,
  styles: `
    .app-root {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: #f5f7fa;
    }

    .navbar {
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 70px;
    }

    .logo {
      font-size: 1.2rem;
      font-weight: 700;
      color: #0b6f7f;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo img {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      object-fit: cover;
    }

    .logo:hover {
      color: #0a5c69;
    }

    .nav-links {
      display: flex;
      gap: 30px;
    }

    .auth-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .auth-link,
    .auth-logout {
      border: 1px solid #c7d2e7;
      border-radius: 999px;
      padding: 8px 14px;
      background: white;
      color: #334;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
    }

    .auth-link:hover,
    .auth-logout:hover {
      border-color: #0b6f7f;
      color: #0b6f7f;
    }

    .nav-link {
      color: #666;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s;
      padding: 8px 0;
      border-bottom: 2px solid transparent;
    }

    .nav-link:hover {
      color: #0b6f7f;
    }

    .nav-link.active {
      color: #0b6f7f;
      border-bottom-color: #0b6f7f;
    }

    .main-content {
      flex: 1;
      padding: 40px 20px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    .footer {
      background: white;
      border-top: 1px solid #eee;
      padding: 30px 20px;
      text-align: center;
      color: #666;
      margin-top: 40px;
    }

    .footer p {
      margin: 0;
    }

    @media (max-width: 768px) {
      .nav-container {
        height: auto;
        padding-top: 10px;
        padding-bottom: 10px;
        align-items: flex-start;
        gap: 10px;
        flex-direction: column;
      }

      .nav-links {
        gap: 12px;
        font-size: 0.9rem;
      }
    }
  `,
})
export class App {
  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
  ) {
    effect(() => {
      if (this.auth.loading()) {
        return;
      }

      if (!this.auth.canUseApp() && this.router.url !== '/acceso') {
        void this.router.navigate(['/acceso'], { replaceUrl: true });
      }
    });
  }

  logout(): void {
    this.auth
      .logout()
      .then(() => this.router.navigate(['/acceso'], { replaceUrl: true }))
      .catch(() => undefined);
  }
}
