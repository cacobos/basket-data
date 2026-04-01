import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AnalysisApiService,
  FebLeague,
  FebLeagueGroup,
  FebLeagueTeam,
  TeamSearchLock,
} from '../../analysis-api.service';
import { CardLeagueComponent } from '../../components/card-league/card-league.component';
import { CardTeamComponent } from '../../components/card-team/card-team.component';
import { JobsStoreService, JobState } from '../../services/jobs-store.service';

@Component({
  selector: 'app-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule, CardLeagueComponent, CardTeamComponent],
  template: `
    <div class="analyzer-page">
      <header class="hero">
        <h1>Nueva busqueda</h1>
        <p>Flujo guiado: competicion, grupo, equipo y ejecucion automatica.</p>
      </header>

      <section class="carousel-shell">
        <div class="steps-indicator">
          <button class="step-pill" [class.active]="activeSlide() === 0" (click)="goToSlide(0)">
            1. Liga
          </button>
          <button
            class="step-pill"
            [class.active]="activeSlide() === 1"
            [disabled]="!selectedLeague()"
            (click)="goToSlide(1)"
          >
            2. Grupo
          </button>
          <button
            class="step-pill"
            [class.active]="activeSlide() === 2"
            [disabled]="!selectedGroupId()"
            (click)="goToSlide(2)"
          >
            3. Equipo
          </button>
          <button
            class="step-pill"
            [class.active]="activeSlide() === 3"
            [disabled]="!selectedTeamId()"
            (click)="goToSlide(3)"
          >
            4. Ejecutar
          </button>
        </div>

        <div class="carousel-viewport">
          <div class="carousel-track" [style.transform]="trackTransform()">
            <section class="slide">
              <h2>Selecciona liga</h2>
              <div class="cards-grid">
                <app-card-league
                  *ngFor="let league of leagues()"
                  [leagueId]="league.leagueId"
                  [name]="league.slug"
                  [isActive]="selectedLeague()?.leagueId === league.leagueId"
                  (click)="onLeagueSelect(league)"
                ></app-card-league>
              </div>
            </section>

            <section class="slide">
              <h2>Selecciona grupo</h2>
              <div class="group-grid" *ngIf="groups().length > 0; else noGroups">
                <button
                  class="group-card"
                  *ngFor="let group of groups()"
                  [class.selected]="selectedGroupId() === group.groupId"
                  (click)="onGroupSelect(group.groupId)"
                >
                  {{ group.name }}
                </button>
              </div>
              <ng-template #noGroups>
                <p class="muted">
                  Esta liga no tiene grupos. Continuamos directo al paso de equipo.
                </p>
                <button class="primary" (click)="goToTeamsWithoutGroup()">Continuar</button>
              </ng-template>
            </section>

            <section class="slide">
              <h2>Selecciona equipo</h2>
              <p class="muted" *ngIf="teamSelectionMessage()">{{ teamSelectionMessage() }}</p>
              <div class="cards-grid">
                <app-card-team
                  *ngFor="let team of teams()"
                  [teamId]="team.teamId"
                  [name]="team.name"
                  [isActive]="selectedTeamId() === team.teamId"
                  [disabled]="isTeamLocked(team.teamId)"
                  [disabledReason]="teamLockReason(team.teamId)"
                  (click)="onTeamSelect(team)"
                ></app-card-team>
              </div>
            </section>

            <section class="slide">
              <h2>Lanzar busqueda</h2>
              <p class="muted">Los partidos se resolveran automaticamente al crear la busqueda.</p>

              <div class="launch-row">
                <button class="primary" [disabled]="isLaunchDisabled()" (click)="launchJob()">
                  {{ launching() ? 'Lanzando...' : 'Lanzar busqueda' }}
                </button>
                <button class="ghost" (click)="goJobs()">Ver mis busquedas</button>
              </div>
              <p class="muted" *ngIf="launchError()">{{ launchError() }}</p>
              <p class="muted" *ngIf="selectedTeamId() && isTeamLocked(selectedTeamId())">
                Este equipo ya tiene una busqueda compartida activa/reciente. Se habilitara al
                expirar en 24h.
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: `
    .analyzer-page {
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px;
    }
    .hero {
      margin-bottom: 16px;
    }
    .hero h1 {
      margin: 0 0 6px;
    }
    .hero p {
      margin: 0;
      color: #556;
    }

    .carousel-shell {
      background: #fff;
      border: 1px solid #dde3ef;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 12px 28px rgba(20, 24, 40, 0.08);
    }
    .steps-indicator {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .step-pill {
      border: 1px solid #c7d2e7;
      border-radius: 999px;
      padding: 8px 12px;
      background: #f6f9ff;
      cursor: pointer;
    }
    .step-pill.active {
      border-color: #0b6f7f;
      background: #e5f7f4;
    }

    .carousel-viewport {
      overflow: hidden;
      border-radius: 12px;
    }
    .carousel-track {
      display: flex;
      width: 400%;
      transition: transform 420ms ease;
    }
    .slide {
      width: 25%;
      padding: 14px;
      min-height: 430px;
    }
    .slide h2 {
      margin-top: 0;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }
    .group-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
    }
    .group-card {
      border: 1px solid #c7d2e7;
      border-radius: 10px;
      padding: 12px;
      cursor: pointer;
      background: #fff;
    }
    .group-card.selected {
      background: #e5f7f4;
      border-color: #0b6f7f;
    }

    .matches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    .match-card {
      border: 1px solid #c7d2e7;
      border-radius: 10px;
      padding: 12px;
      text-align: left;
      display: grid;
      gap: 4px;
      cursor: pointer;
      background: #fff;
    }
    .match-card.selected {
      background: #e5f7f4;
      border-color: #0b6f7f;
    }

    .filters-row {
      margin: 8px 0 10px;
    }
    .launch-row {
      display: flex;
      gap: 10px;
      margin-top: 14px;
      flex-wrap: wrap;
    }
    .primary {
      border: 0;
      border-radius: 999px;
      padding: 10px 16px;
      background: linear-gradient(135deg, #0b6f7f, #0f9e8f);
      color: #fff;
      cursor: pointer;
    }
    .ghost {
      border: 1px solid #c7d2e7;
      border-radius: 999px;
      padding: 10px 16px;
      background: #fff;
      cursor: pointer;
    }
    .muted {
      color: #667;
    }

    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  `,
})
export class AnalyzerComponent {
  leagues = signal<FebLeague[]>([]);
  groups = signal<FebLeagueGroup[]>([]);
  teams = signal<FebLeagueTeam[]>([]);

  selectedLeague = signal<FebLeague | null>(null);
  selectedGroupId = signal<string>('');
  selectedTeamId = signal<string>('');
  selectedTeamName = signal<string>('');

  launching = signal(false);
  launchError = signal('');
  activeSlide = signal(0);
  teamLocks = signal<TeamSearchLock[]>([]);
  teamSelectionMessage = signal('');

  trackTransform = computed(() => `translateX(-${this.activeSlide() * 25}%)`);

  constructor(
    private readonly api: AnalysisApiService,
    private readonly jobsStore: JobsStoreService,
    private readonly router: Router,
  ) {
    this.loadLeagues();
    this.loadTeamLocks();
  }

  loadTeamLocks(): void {
    this.api.getTeamLocks().subscribe({
      next: (locks) => this.teamLocks.set(locks || []),
      error: () => this.teamLocks.set([]),
    });
  }

  goToSlide(index: number): void {
    this.activeSlide.set(index);
  }

  loadLeagues(): void {
    this.api.getLeagues().subscribe({
      next: (leagues) => this.leagues.set(leagues || []),
      error: () => this.leagues.set([]),
    });
  }

  onLeagueSelect(league: FebLeague): void {
    this.selectedLeague.set(league);
    this.selectedGroupId.set('');
    this.selectedTeamId.set('');
    this.selectedTeamName.set('');
    this.groups.set([]);
    this.teams.set([]);
    this.teamSelectionMessage.set('');

    this.api.getLeagueTeams(league.leagueId, league.seasonId, league.slug).subscribe({
      next: (res) => {
        this.groups.set(res.groups || []);
        this.teams.set(res.groups?.length ? [] : res.teams || []);
        this.activeSlide.set(1);
        if ((res.groups || []).length === 0) {
          this.activeSlide.set(2);
        }
        this.showTeamLocksMessage();
      },
      error: () => {
        this.groups.set([]);
        this.teams.set([]);
      },
    });
  }

  goToTeamsWithoutGroup(): void {
    const league = this.selectedLeague();
    if (!league) return;
    this.api.getLeagueTeams(league.leagueId, league.seasonId, league.slug).subscribe({
      next: (res) => {
        this.teams.set(res.teams || []);
        this.activeSlide.set(2);
        this.showTeamLocksMessage();
      },
    });
  }

  onGroupSelect(groupId: string): void {
    this.selectedGroupId.set(groupId);
    this.selectedTeamId.set('');
    this.selectedTeamName.set('');

    const league = this.selectedLeague();
    if (!league) return;

    this.api.getLeagueTeams(league.leagueId, league.seasonId, league.slug, groupId).subscribe({
      next: (res) => {
        this.teams.set(res.teams || []);
        this.activeSlide.set(2);
        this.showTeamLocksMessage();
      },
      error: () => this.teams.set([]),
    });
  }

  onTeamSelect(team: FebLeagueTeam): void {
    if (this.isTeamLocked(team.teamId)) {
      return;
    }

    this.selectedTeamId.set(team.teamId);
    this.selectedTeamName.set(team.name);
    this.launchError.set('');
    this.activeSlide.set(3);
  }

  isTeamLocked(teamId: string): boolean {
    return this.teamLocks().some((lock) => lock.teamId === String(teamId));
  }

  private getTeamLock(teamId: string): TeamSearchLock | null {
    return this.teamLocks().find((lock) => lock.teamId === String(teamId)) ?? null;
  }

  teamLockReason(teamId: string): string {
    const lock = this.getTeamLock(teamId);
    if (!lock) {
      return '';
    }

    const expiresAt = new Date(lock.expiresAt).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Bloqueado hasta ${expiresAt}`;
  }

  private showTeamLocksMessage(): void {
    const totalLocked = this.teams().filter((team) => this.isTeamLocked(team.teamId)).length;
    if (totalLocked === 0) {
      this.teamSelectionMessage.set('');
      return;
    }

    this.teamSelectionMessage.set(
      `${totalLocked} equipo(s) tienen busquedas recientes y aparecen deshabilitados hasta cumplir 24h.`,
    );
  }

  isLaunchDisabled(): boolean {
    return this.launching() || !this.selectedTeamId() || this.isTeamLocked(this.selectedTeamId());
  }

  launchJob(): void {
    if (this.isLaunchDisabled()) return;

    const teamId = this.selectedTeamId();
    if (!teamId) {
      return;
    }

    this.launching.set(true);
    this.launchError.set('');

    const request = {
      matchIds: [],
      teamId,
      wonOnly: false,
      lineupMode: 'any' as const,
      playerIds: [],
    };

    this.api.createJob(request).subscribe({
      next: (job) => {
        const state: JobState = {
          jobId: job.id,
          status: job.status,
          selectedLeague: this.selectedLeague()?.leagueId,
          selectedLeagueName: this.selectedLeague()?.slug,
          selectedTeam: this.selectedTeamName() || teamId,
          selectedTeamId: teamId,
          selectedTeamName: this.selectedTeamName() || teamId,
          selectedMatches: [],
          selectedPlayers: [],
          matchIds: [],
          lineupMode: 'any',
          won_only: false,
          createdAt: new Date(job.createdAt),
          updatedAt: new Date(job.updatedAt),
          launchedBy: job.launchedBy ?? null,
        };
        this.jobsStore.addJob(state);
        this.jobsStore.trackJob(job.id);
        this.loadTeamLocks();
        this.launching.set(false);
        this.router.navigate(['/busquedas']);
      },
      error: (err) => {
        this.launching.set(false);
        const text = String((err as { error?: { message?: string } })?.error?.message || '');
        if (text.includes('Ya existe una busqueda para este equipo')) {
          this.launchError.set(text);
          this.loadTeamLocks();
          return;
        }

        this.launchError.set('No se pudo crear la busqueda.');
        console.error(err);
      },
    });
  }

  goJobs(): void {
    this.router.navigate(['/busquedas']);
  }
}
