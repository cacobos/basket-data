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
          <h1>FEB Data Analyzer</h1>
          <p class="subtitle">Analiza partidos, jugadores y estadísticas de la Liga ACB y LEB</p>
        </div>
      </section>

      <!-- Features Grid -->
      <section class="features">
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h2>Analizador</h2>
          <p>
            Selecciona competición, equipo, partido y acciones. Obtén datos en tiempo real de
            jugadores en cancha.
          </p>
          <a class="btn btn-primary" routerLink="/analyzer">Ir al Analizador →</a>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📋</div>
          <h2>Historial de Trabajos</h2>
          <p>
            Accede a todos tus análisis anteriores. Visualiza el estado y resultados de cada
            solicitud.
          </p>
          <a class="btn btn-secondary" routerLink="/jobs">Ver Trabajos →</a>
        </div>

        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h2>Datos en Vivo</h2>
          <p>
            Obtén información actualizada directamente de la FEB. Sin datos ficticios, todo real.
          </p>
          <div class="badge">Actualizado constantemente</div>
        </div>
      </section>

      <!-- Info Section -->
      <section class="info">
        <h2>¿Cómo funciona?</h2>
        <div class="steps">
          <div class="step">
            <span class="step-number">1</span>
            <h3>Selecciona Liga</h3>
            <p>Elige entre Liga ACB, ACB Plata o LEB</p>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <h3>Elige Equipo</h3>
            <p>Selecciona el equipo que quieres analizar</p>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <h3>Filtra Partidos</h3>
            <p>Elige qué partidos usar para el análisis</p>
          </div>
          <div class="step">
            <span class="step-number">4</span>
            <h3>Selecciona Acciones</h3>
            <p>Filtra por tipo de acción (canasta, asistencia, etc.)</p>
          </div>
          <div class="step">
            <span class="step-number">5</span>
            <h3>Configura Filtros</h3>
            <p>Personaliza criterios (victorias, anotadores, etc.)</p>
          </div>
          <div class="step">
            <span class="step-number">6</span>
            <h3>Ejecuta Análisis</h3>
            <p>Lanza el análisis y obtén los resultados</p>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="cta">
        <h2>Comienza ahora</h2>
        <p>Accede al analizador para obtener insights profundos de tus datos de baloncesto</p>
        <a class="btn btn-large" routerLink="/analyzer">Ir al Analizador</a>
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
