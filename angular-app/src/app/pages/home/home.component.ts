import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-container">
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-content">
          <h1>Basket Data</h1>
          <p class="subtitle">
            Convierte estadisticas complejas en respuestas claras para entrenadores y staff.
          </p>
        </div>
      </section>

      <!-- Features Grid -->
      <section class="features">
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h2>Nueva busqueda guiada</h2>
          <p>
            Elige competicion y equipo en 4 pasos simples. Nosotros hacemos el procesamiento por
            ti.
          </p>
          <a class="btn btn-primary" routerLink="/analyzer">Empezar ahora →</a>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📋</div>
          <h2>Mis busquedas</h2>
          <p>
            Consulta resultados anteriores, filtra por estado y abre cada analisis cuando lo
            necesites.
          </p>
          <a class="btn btn-secondary" routerLink="/busquedas">Ver busquedas →</a>
        </div>

        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h2>Datos oficiales FEB</h2>
          <p>
            Trabaja con informacion actualizada directamente desde la FEB para tomar decisiones con
            contexto real.
          </p>
          <div class="badge">Actualizado constantemente</div>
        </div>
      </section>

      <!-- Info Section -->
      <section class="info">
        <h2>Como funciona</h2>
        <div class="steps">
          <div class="step">
            <span class="step-number">1</span>
            <h3>Elige competicion</h3>
            <p>Selecciona la liga o categoria que vas a revisar</p>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <h3>Selecciona equipo</h3>
            <p>Marca el equipo sobre el que quieres obtener informacion</p>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <h3>Confirma grupo</h3>
            <p>Si aplica, elige grupo para acotar la busqueda</p>
          </div>
          <div class="step">
            <span class="step-number">4</span>
            <h3>Lanza la busqueda</h3>
            <p>Inicia el procesamiento con un clic</p>
          </div>
          <div class="step">
            <span class="step-number">5</span>
            <h3>Abre resultados</h3>
            <p>Revisa tablas de posesiones y quintetos filtrables</p>
          </div>
          <div class="step">
            <span class="step-number">6</span>
            <h3>Comparte insights</h3>
            <p>Exporta JSON o CSV para compartir con tu equipo tecnico</p>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="cta">
        <h2>Empieza en menos de 1 minuto</h2>
        <p>Crea tu primera busqueda y consulta resultados claros, sin lenguaje tecnico.</p>
        <a class="btn btn-large" routerLink="/analyzer">Crear nueva busqueda</a>
      </section>
    </div>
  `,
  styles: `
    .home-container {
      width: 100%;
    }

    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 80px 20px;
      text-align: center;
    }

    .hero-content h1 {
      font-size: 3.5rem;
      margin: 0 0 10px 0;
      font-weight: 700;
    }

    .subtitle {
      font-size: 1.25rem;
      margin: 0;
      opacity: 0.9;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      padding: 80px 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .feature-card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      gap: 15px;
      transition:
        transform 0.3s,
        box-shadow 0.3s;
    }

    .feature-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
    }

    .feature-icon {
      font-size: 3rem;
      display: inline-block;
    }

    .feature-card h2 {
      font-size: 1.5rem;
      margin: 0;
    }

    .feature-card p {
      margin: 0;
      color: #666;
    }

    .badge {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      width: fit-content;
    }

    .btn {
      display: inline-block;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      text-align: center;
      cursor: pointer;
      border: none;
      font-size: 1rem;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .btn-large {
      padding: 16px 40px;
      font-size: 1.1rem;
    }

    .info {
      padding: 80px 20px;
      background: #f5f5f5;
    }

    .info h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 50px;
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 30px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .step {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      background: #667eea;
      color: white;
      border-radius: 50%;
      font-weight: 700;
      font-size: 1.5rem;
    }

    .step h3 {
      margin: 0;
      font-size: 1.2rem;
    }

    .step p {
      margin: 0;
      color: #666;
    }

    .cta {
      text-align: center;
      padding: 60px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .cta h2 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }

    .cta p {
      font-size: 1.1rem;
      margin-bottom: 30px;
    }

    @media (max-width: 768px) {
      .hero-content h1 {
        font-size: 2rem;
      }

      .steps {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class HomeComponent {}
