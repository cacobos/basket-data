import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { AnalysisApiService, FebLiveMatch, FebLivePossessionSummary } from '../../analysis-api.service';

@Component({
  selector: 'app-live-matches',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="live-page">
      <header class="hero">
        <h1>Partidos en vivo</h1>
        <p>
          Seguimiento rapido de partidos detectados en directo y resumen de posesiones por equipo.
        </p>
      </header>

      <div class="toolbar">
        <button class="btn" (click)="reloadAll()" [disabled]="loadingMatches()">
          {{ loadingMatches() ? 'Cargando...' : 'Actualizar ahora' }}
        </button>
        <span class="hint">Actualizacion automatica cada 60s</span>
      </div>

      <p class="error" *ngIf="matchesError()">{{ matchesError() }}</p>

      <div class="empty" *ngIf="!loadingMatches() && !matchesError() && matches().length === 0">
        No hay partidos marcados en vivo en este momento.
      </div>

      <div class="grid" *ngIf="matches().length > 0">
        <article class="card" *ngFor="let match of matches()">
          <header>
            <h2>{{ match.homeTeamId || 'Local' }} vs {{ match.awayTeamId || 'Visitante' }}</h2>
            <span class="badge">Fuente {{ match.source }}</span>
          </header>

          <div class="meta">
            <span>Partido {{ match.matchId }}</span>
            <span>{{ match.clock || 'Sin reloj' }}</span>
            <span>Q{{ match.quarter || '-' }}</span>
            <span *ngIf="match.score">{{ match.score }}</span>
          </div>

          <div class="actions">
            <button
              class="btn-secondary"
              (click)="loadPossessions(match, match.homeTeamId)"
              [disabled]="!match.homeTeamId"
            >
              Posesiones local
            </button>
            <button
              class="btn-secondary"
              (click)="loadPossessions(match, match.awayTeamId)"
              [disabled]="!match.awayTeamId"
            >
              Posesiones visitante
            </button>
          </div>

          <section class="possessions" *ngIf="selectedMatchId() === match.matchId">
            <p class="error" *ngIf="possessionsError()">{{ possessionsError() }}</p>
            <p *ngIf="loadingPossessions()">Cargando posesiones...</p>

            <table *ngIf="!loadingPossessions() && possessionSummary()">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Total</th>
                  <th>Pts/Pos</th>
                  <th>Propias</th>
                  <th>Rival</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ possessionSummary()?.teamId }}</td>
                  <td>{{ possessionSummary()?.total }}</td>
                  <td>-</td>
                  <td>{{ possessionSummary()?.ownOffense }}</td>
                  <td>{{ possessionSummary()?.opponentOffense }}</td>
                </tr>
              </tbody>
            </table>

            <p *ngIf="!loadingPossessions() && !possessionsError() && !possessionSummary()">
              Sin datos de posesiones para este partido.
            </p>
          </section>
        </article>
      </div>
    </section>
  `,
  styles: `
    .live-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .hero {
      border-radius: 16px;
      padding: 24px;
      background: linear-gradient(130deg, #0b6f7f, #29a4b5);
      color: white;
    }

    .hero h1 {
      margin: 0 0 8px;
      font-size: 2rem;
    }

    .hero p {
      margin: 0;
      max-width: 700px;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn,
    .btn-secondary {
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 700;
      padding: 10px 14px;
    }

    .btn {
      background: #0b6f7f;
      color: white;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #eef6f8;
      color: #0b6f7f;
    }

    .hint {
      color: #56616b;
      font-size: 0.95rem;
    }

    .error {
      color: #b42318;
      margin: 0;
    }

    .empty {
      padding: 24px;
      border-radius: 12px;
      background: #f3f5f7;
      color: #45515c;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }

    .card {
      border: 1px solid #d6e1e6;
      border-radius: 14px;
      padding: 16px;
      background: white;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .card h2 {
      margin: 0 0 6px;
      font-size: 1.1rem;
    }

    .badge {
      display: inline-block;
      background: #eaf6f8;
      color: #0b6f7f;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .meta {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      color: #475569;
      font-size: 0.9rem;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .possessions {
      border-top: 1px solid #e5edf0;
      padding-top: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th,
    td {
      padding: 6px 4px;
      text-align: left;
      border-bottom: 1px solid #f0f3f5;
    }
  `,
})
export class LiveMatchesComponent implements OnInit, OnDestroy {
  private readonly intervalMs = 60000;
  private refreshHandle: ReturnType<typeof setInterval> | undefined;

  readonly matches = signal<FebLiveMatch[]>([]);
  readonly loadingMatches = signal(false);
  readonly matchesError = signal<string | null>(null);

  readonly selectedMatchId = signal<string | null>(null);
  readonly possessionSummary = signal<FebLivePossessionSummary | null>(null);
  readonly loadingPossessions = signal(false);
  readonly possessionsError = signal<string | null>(null);

  readonly selectedMatch = computed(() =>
    this.matches().find((match) => match.matchId === this.selectedMatchId()) || null,
  );

  constructor(private readonly api: AnalysisApiService) {}

  ngOnInit(): void {
    this.reloadMatches();
    this.refreshHandle = setInterval(() => this.reloadMatches(), this.intervalMs);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = undefined;
    }
  }

  reloadAll(): void {
    this.reloadMatches();
    const selected = this.selectedMatch();
    if (selected) {
      const candidateTeam = selected.homeTeamId || selected.awayTeamId;
      this.loadPossessions(selected, candidateTeam);
    }
  }

  loadPossessions(match: FebLiveMatch, teamId: string | null): void {
    if (!teamId) {
      return;
    }

    this.selectedMatchId.set(match.matchId);
    this.loadingPossessions.set(true);
    this.possessionsError.set(null);

    this.api.getLiveMatchPossessions(match.matchId, teamId).subscribe({
      next: (summary) => {
        this.possessionSummary.set(summary);
        this.loadingPossessions.set(false);
      },
      error: () => {
        this.possessionSummary.set(null);
        this.loadingPossessions.set(false);
        this.possessionsError.set('No se han podido cargar las posesiones de este partido.');
      },
    });
  }

  private reloadMatches(): void {
    this.loadingMatches.set(true);
    this.matchesError.set(null);

    this.api.getLiveMatches().subscribe({
      next: (data) => {
        this.matches.set(data);
        this.loadingMatches.set(false);
        if (this.selectedMatchId() && !data.some((m) => m.matchId === this.selectedMatchId())) {
          this.selectedMatchId.set(null);
          this.possessionSummary.set(null);
        }
      },
      error: () => {
        this.matches.set([]);
        this.loadingMatches.set(false);
        this.matchesError.set('No se han podido cargar partidos en vivo.');
      },
    });
  }
}
