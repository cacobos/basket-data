import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <div class="app-root">
      <!-- Navbar -->
      <nav class="navbar">
        <div class="nav-container">
          <a routerLink="/" class="logo"> 🏀 FEB Data Analyzer </a>
          <div class="nav-links">
            <a
              routerLink="/"
              class="nav-link"
              routerLinkActive="active"
              routerLinkActiveOptions="{exact: true}"
            >
              Inicio
            </a>
            <a routerLink="/analyzer" class="nav-link" routerLinkActive="active"> Analizador </a>
            <a routerLink="/jobs" class="nav-link" routerLinkActive="active"> Trabajos </a>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer class="footer">
        <p>&copy; 2024 FEB Data Analyzer. Datos en vivo de la Federación Española de Baloncesto.</p>
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
      font-size: 1.5rem;
      font-weight: 700;
      color: #667eea;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo:hover {
      color: #5568d3;
    }

    .nav-links {
      display: flex;
      gap: 30px;
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
      color: #667eea;
    }

    .nav-link.active {
      color: #667eea;
      border-bottom-color: #667eea;
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
      .nav-links {
        gap: 15px;
        font-size: 0.9rem;
      }

      .logo {
        font-size: 1.2rem;
      }

      .nav-container {
        height: 60px;
      }
    }
  `,
})
export class App {}
