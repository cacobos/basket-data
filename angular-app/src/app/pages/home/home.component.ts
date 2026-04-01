import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-container">
      <section class="hero">
        <div class="hero-main">
          <h1>Centro operativo</h1>
          <p class="subtitle">
            Gestiona busquedas compartidas, evita duplicidades por equipo y consulta partidos en
            vivo con un flujo unico.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" routerLink="/analyzer">Nueva busqueda</a>
            <a class="btn btn-secondary" routerLink="/en-vivo">Ver en vivo</a>
          </div>
        </div>
        <div class="hero-note">
          <h3>Reglas activas</h3>
          <ul>
            <li>Busquedas visibles para todos los usuarios autenticados</li>
            <li>Bloqueo automatico por equipo mientras exista una busqueda activa</li>
            <li>Retencion de 24h para resultados y estado de jobs</li>
          </ul>
        </div>
      </section>

      <section class="modules">
        <article class="module-card">
          <h2>Analizador FEB</h2>
          <p>
            Flujo guiado por competicion, grupo y equipo. El sistema bloquea equipos ocupados para
            evitar analisis duplicados.
          </p>
          <a class="inline-link" routerLink="/analyzer">Abrir analizador</a>
        </article>

        <article class="module-card">
          <h2>Busquedas compartidas</h2>
          <p>
            Vista centralizada de trabajos en cola, procesando, completados y con error para todo
            el staff.
          </p>
          <a class="inline-link" routerLink="/busquedas">Ir al listado</a>
        </article>

        <article class="module-card">
          <h2>Partidos en vivo</h2>
          <p>
            Deteccion de encuentros activos y consulta de resumen de posesiones por equipo en una
            pantalla independiente.
          </p>
          <a class="inline-link" routerLink="/en-vivo">Abrir modulo en vivo</a>
        </article>
      </section>

      <section class="checklist">
        <h2>Flujo recomendado de uso</h2>
        <ol>
          <li>Revisar si el equipo ya tiene una busqueda activa.</li>
          <li>Lanzar una nueva busqueda solo si el equipo esta disponible.</li>
          <li>Consultar resultados compartidos y abrir el detalle del job.</li>
          <li>Usar modulo en vivo para contraste tactico inmediato.</li>
        </ol>
      </section>
    </div>
  `,
  styles: `
    .home-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .hero {
      background:
        radial-gradient(circle at 90% 20%, rgba(78, 207, 190, 0.26), transparent 35%),
        linear-gradient(135deg, #083f4a 0%, #0b6f7f 55%, #28a3b4 100%);
      color: white;
      border-radius: 18px;
      padding: 28px;
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 20px;
    }

    .hero-main h1 {
      margin: 0 0 8px;
      font-size: 2.2rem;
      font-family: 'Space Grotesk', sans-serif;
    }

    .subtitle {
      margin: 0;
      max-width: 680px;
      opacity: 0.95;
    }

    .hero-actions {
      display: flex;
      gap: 10px;
      margin-top: 18px;
    }

    .hero-note {
      background: rgba(3, 23, 28, 0.26);
      border: 1px solid rgba(183, 239, 231, 0.32);
      border-radius: 14px;
      padding: 16px;
    }

    .hero-note h3 {
      margin: 0 0 8px;
    }

    .hero-note ul {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .modules {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .module-card {
      background: white;
      border: 1px solid #dbe7ec;
      border-radius: 14px;
      padding: 18px;
      box-shadow: 0 5px 18px rgba(9, 41, 55, 0.08);
    }

    .module-card h2 {
      margin: 0 0 6px;
      font-size: 1.25rem;
      font-family: 'Space Grotesk', sans-serif;
      color: #093742;
    }

    .module-card p {
      margin: 0 0 12px;
      color: #415465;
    }

    .checklist {
      background: #f2f8fb;
      border: 1px solid #d6e5eb;
      border-radius: 14px;
      padding: 18px;
    }

    .checklist h2 {
      margin: 0 0 10px;
      font-family: 'Space Grotesk', sans-serif;
      color: #0a4957;
    }

    .checklist ol {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .btn {
      display: inline-block;
      padding: 10px 16px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 700;
      text-align: center;
      font-size: 0.95rem;
    }

    .btn-primary {
      background: #f6c451;
      color: #28313d;
    }

    .btn-primary:hover {
      background: #e6b546;
    }

    .btn-secondary {
      background: rgba(240, 248, 250, 0.95);
      color: #0b6f7f;
    }

    .btn-secondary:hover {
      background: #e4f2f5;
    }

    .inline-link {
      color: #0b6f7f;
      font-weight: 700;
      text-decoration: none;
    }

    .inline-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 900px) {
      .hero {
        grid-template-columns: 1fr;
      }

      .hero-main h1 {
        font-size: 1.8rem;
      }
    }
  `,
})
export class HomeComponent {}
