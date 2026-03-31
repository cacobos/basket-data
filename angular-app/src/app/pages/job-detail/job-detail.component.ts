import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AnalysisApiService } from '../../analysis-api.service';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { ImageAssetService } from '../../services/image-asset.service';
import { JobsStoreService } from '../../services/jobs-store.service';

type HomeAwayFilter = 'all' | 'home' | 'away';
type OutcomeFilter = 'all' | 'won' | 'lost';

interface PlayRow {
  index: number;
  quarter: number | null;
  clock: string | null;
  side: 'own_offense' | 'opponent_offense';
  changeReason: string;
  points: number;
  description: string;
  ownLineup?: string[];
  opponentLineup?: string[];
}

interface MatchResult {
  matchId: string;
  isHome: boolean | null;
  won: boolean | null;
  total: number;
  ownOffense: number;
  opponentOffense: number;
  ownOffensePoints?: number;
  opponentOffensePoints?: number;
  ownPointsPerPossession?: number;
  opponentPointsPerPossession?: number;
  ownOffensePossessions?: PlayRow[];
  opponentOffensePossessions?: PlayRow[];
  possessions?: PlayRow[];
}

interface FilterablePlay extends PlayRow {
  matchId: string;
  isHome: boolean | null;
  won: boolean | null;
}

interface QuintetRow {
  playerIds: string[];
  possessions: number;
  points: number;
  pointsPerPossession: number;
}

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, FormsModule],
  template: `
    <div class="job-detail" *ngIf="job(); else notFound">
      <section class="top-compact">
        <div class="top-row">
          <a routerLink="/jobs" class="back">← Jobs</a>
          <app-status-badge [status]="job()!.status"></app-status-badge>
        </div>
        <h1>Detalle de job</h1>
        <p class="meta-mini">
          {{ displayTeamName() }} · {{ job()!.matchIds.length }} partidos ·
          {{ formatDate(job()!.updatedAt) }}
        </p>
      </section>

      <section class="controls" *ngIf="job()!.result">
        <label>
          Buscar jugada
          <input
            [ngModel]="playFilter()"
            (ngModelChange)="setPlayFilter($event)"
            placeholder="texto de jugada"
          />
        </label>
        <button class="ghost" (click)="exportJson()">Exportar JSON</button>
        <button class="ghost" (click)="exportCsv()">Exportar CSV</button>
      </section>

      <section class="button-filters" *ngIf="job()!.result">
        <div class="filter-group">
          <span class="group-title">En casa/Fuera</span>
          <button
            class="chip"
            [class.active]="homeAwayFilter() === 'all'"
            (click)="setHomeAwayFilter('all')"
          >
            Todos
          </button>
          <button
            class="chip"
            [class.active]="homeAwayFilter() === 'home'"
            (click)="setHomeAwayFilter('home')"
          >
            En casa
          </button>
          <button
            class="chip"
            [class.active]="homeAwayFilter() === 'away'"
            (click)="setHomeAwayFilter('away')"
          >
            Fuera
          </button>
        </div>

        <div class="filter-group">
          <span class="group-title">Victoria/Derrota</span>
          <button
            class="chip"
            [class.active]="outcomeFilter() === 'all'"
            (click)="setOutcomeFilter('all')"
          >
            Todos
          </button>
          <button
            class="chip"
            [class.active]="outcomeFilter() === 'won'"
            (click)="setOutcomeFilter('won')"
          >
            Victoria
          </button>
          <button
            class="chip"
            [class.active]="outcomeFilter() === 'lost'"
            (click)="setOutcomeFilter('lost')"
          >
            Derrota
          </button>
        </div>

        <div class="filter-group">
          <span class="group-title">Cuarto</span>
          <button
            class="chip"
            [class.active]="quarterFilter() === 'all'"
            (click)="setQuarterFilter('all')"
          >
            Todos
          </button>
          <button
            class="chip"
            *ngFor="let quarter of availableQuarters()"
            [class.active]="quarterFilter() === quarter"
            (click)="setQuarterFilter(quarter)"
          >
            Q{{ quarter }}
          </button>
        </div>

        <div class="filter-group" *ngIf="availableOnCourtPlayers().length > 0">
          <span class="group-title">Jugadoras en pista</span>
          <button
            class="chip"
            [class.active]="selectedPlayerIds().length === 0"
            (click)="clearPlayerFilter()"
          >
            Todas
          </button>
          <button
            class="chip chip-player"
            *ngFor="let playerId of availableOnCourtPlayers()"
            [class.active]="isPlayerSelected(playerId)"
            (click)="togglePlayerFilter(playerId)"
          >
            <img
              *ngIf="playerPhoto(playerId)"
              [src]="playerPhoto(playerId)!"
              [alt]="playerLabel(playerId)"
              (error)="onPlayerImageError(playerId)"
            />
            <span>{{ playerLabel(playerId) }}</span>
          </button>
        </div>
      </section>

      <section *ngIf="job()!.result; else pending" class="dual-tables">
        <article class="table-panel">
          <header class="panel-header own">
            <h3>Ataques propios</h3>
            <div class="panel-stats">
              <span>Posesiones: {{ ownFilteredPlays().length }}</span>
              <span>Puntos: {{ ownPointsTotal() }}</span>
              <span>Puntos/Pos: {{ formatPpp(ownPpp()) }}</span>
            </div>
          </header>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cuarto</th>
                  <th>Reloj</th>
                  <th>Tipo</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let play of ownPaginatedPlays()">
                  <td>{{ play.quarter ?? '-' }}</td>
                  <td>{{ play.clock || '-' }}</td>
                  <td>{{ translateType(play.changeReason) }}</td>
                  <td>{{ play.points }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer class="pager" *ngIf="ownTotalPages() > 1">
            <button class="ghost" (click)="prevOwnPage()" [disabled]="ownPage() <= 1">
              Anterior
            </button>
            <span>Página {{ ownPage() }} / {{ ownTotalPages() }}</span>
            <button class="ghost" (click)="nextOwnPage()" [disabled]="ownPage() >= ownTotalPages()">
              Siguiente
            </button>
          </footer>
        </article>

        <article class="table-panel">
          <header class="panel-header rival">
            <h3>Ataques del rival</h3>
            <div class="panel-stats">
              <span>Posesiones: {{ opponentFilteredPlays().length }}</span>
              <span>Puntos: {{ opponentPointsTotal() }}</span>
              <span>Puntos/Pos: {{ formatPpp(opponentPpp()) }}</span>
            </div>
          </header>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cuarto</th>
                  <th>Reloj</th>
                  <th>Tipo</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let play of opponentPaginatedPlays()">
                  <td>{{ play.quarter ?? '-' }}</td>
                  <td>{{ play.clock || '-' }}</td>
                  <td>{{ translateType(play.changeReason) }}</td>
                  <td>{{ play.points }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer class="pager" *ngIf="opponentTotalPages() > 1">
            <button class="ghost" (click)="prevOpponentPage()" [disabled]="opponentPage() <= 1">
              Anterior
            </button>
            <span>Página {{ opponentPage() }} / {{ opponentTotalPages() }}</span>
            <button
              class="ghost"
              (click)="nextOpponentPage()"
              [disabled]="opponentPage() >= opponentTotalPages()"
            >
              Siguiente
            </button>
          </footer>
        </article>
      </section>

      <section *ngIf="job()!.result" class="quintets-section">
        <article class="table-panel">
          <header class="panel-header quintets">
            <h3>Quintetos</h3>
            <div class="panel-stats">
              <span>Quintetos: {{ filteredQuintets().length }}</span>
            </div>
          </header>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quinteto</th>
                  <th>Posesiones</th>
                  <th>Puntos</th>
                  <th>PPP</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let quintet of quintetsPaginated()">
                  <td>{{ formatQuintet(quintet.playerIds) }}</td>
                  <td>{{ quintet.possessions }}</td>
                  <td>{{ quintet.points }}</td>
                  <td>{{ formatPpp(quintet.pointsPerPossession) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer class="pager" *ngIf="quintetsTotalPages() > 1">
            <button class="ghost" (click)="prevQuintetsPage()" [disabled]="quintetsPage() <= 1">
              Anterior
            </button>
            <span>Página {{ quintetsPage() }} / {{ quintetsTotalPages() }}</span>
            <button
              class="ghost"
              (click)="nextQuintetsPage()"
              [disabled]="quintetsPage() >= quintetsTotalPages()"
            >
              Siguiente
            </button>
          </footer>
        </article>
      </section>

      <ng-template #pending>
        <section class="pending">
          <p *ngIf="job()!.status === 'processing' || job()!.status === 'queued'">
            El job sigue en proceso.
          </p>
          <p *ngIf="job()!.status === 'failed'">
            El job falló: {{ job()!.errorMessage || 'sin detalle' }}
          </p>
          <button class="ghost" (click)="refreshResult()" *ngIf="job()!.status !== 'failed'">
            Actualizar resultado
          </button>
        </section>
      </ng-template>
    </div>

    <ng-template #notFound>
      <p>No se encontró el job.</p>
    </ng-template>
  `,
  styles: `
    .job-detail {
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px;
    }
    .top-compact {
      margin-bottom: 8px;
    }
    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .back {
      color: #0b6f7f;
      text-decoration: none;
      font-weight: 600;
    }
    h1 {
      margin: 6px 0 2px;
      font-size: 1.35rem;
    }
    .meta-mini {
      margin: 0;
      color: #667;
      font-size: 0.9rem;
    }

    .controls {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: end;
    }
    label {
      display: grid;
      gap: 4px;
      font-weight: 600;
    }
    input {
      border: 1px solid #ccd7ea;
      border-radius: 8px;
      padding: 8px;
    }
    .ghost {
      border: 1px solid #ccd7ea;
      border-radius: 999px;
      background: #fff;
      padding: 8px 12px;
      cursor: pointer;
    }

    .button-filters {
      margin-top: 12px;
      display: grid;
      gap: 10px;
      background: #fff;
      border: 1px solid #dbe2ef;
      border-radius: 12px;
      padding: 10px;
    }
    .filter-group {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .group-title {
      font-weight: 700;
      color: #334;
      margin-right: 4px;
    }
    .chip {
      border: 1px solid #ccd7ea;
      border-radius: 999px;
      background: #fff;
      padding: 6px 10px;
      cursor: pointer;
    }
    .chip.active {
      background: #0b6f7f;
      color: #fff;
      border-color: #0b6f7f;
    }
    .chip-player {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 7px 13px 7px 8px;
    }
    .chip-player img {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid #d9e3f4;
    }

    .dual-tables {
      margin-top: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .table-panel {
      background: #fff;
      border: 1px solid #dbe2ef;
      border-radius: 12px;
      overflow: hidden;
    }
    .panel-header {
      padding: 10px 12px;
      border-bottom: 1px solid #dbe2ef;
    }
    .panel-header.own {
      background: #ecf8f5;
    }
    .panel-header.rival {
      background: #fff1f1;
    }
    .panel-header h3 {
      margin: 0 0 6px;
    }
    .panel-stats {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 0.9rem;
      color: #445;
    }

    .quintets-section {
      margin-top: 12px;
    }
    .panel-header.quintets {
      background: #eef4ff;
    }

    .table-wrap {
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 420px;
    }
    th,
    td {
      text-align: left;
      padding: 10px;
      border-bottom: 1px solid #e8edf7;
    }
    .pager {
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .pending {
      margin-top: 12px;
      background: #fff;
      border: 1px solid #dbe2ef;
      border-radius: 12px;
      padding: 12px;
    }
    @media (max-width: 900px) {
      .dual-tables {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class JobDetailComponent {
  jobId = signal<string>('');
  playFilter = signal('');
  homeAwayFilter = signal<HomeAwayFilter>('all');
  outcomeFilter = signal<OutcomeFilter>('all');
  quarterFilter = signal<number | 'all'>('all');
  selectedPlayerIds = signal<string[]>([]);

  ownPage = signal(1);
  opponentPage = signal(1);
  quintetsPage = signal(1);
  readonly pageSize = 5;

  private playerMap = signal<Record<string, { name: string; photoUrl: string }>>({});

  job = computed(() => {
    const id = this.jobId();
    if (!id) return null;
    return this.jobsStore.getJob(id) || null;
  });

  allOwnPlays = computed<FilterablePlay[]>(() => {
    const result = this.job()?.result;
    const matches = (result?.matches || []) as MatchResult[];
    return matches.flatMap((match) => {
      const rows =
        match.ownOffensePossessions ||
        (match.possessions || []).filter((item) => item.side === 'own_offense');

      return rows.map((row) => ({
        ...row,
        matchId: match.matchId,
        isHome: match.isHome ?? null,
        won: match.won,
      }));
    });
  });

  allOpponentPlays = computed<FilterablePlay[]>(() => {
    const result = this.job()?.result;
    const matches = (result?.matches || []) as MatchResult[];
    return matches.flatMap((match) => {
      const rows =
        match.opponentOffensePossessions ||
        (match.possessions || []).filter((item) => item.side === 'opponent_offense');

      return rows.map((row) => ({
        ...row,
        matchId: match.matchId,
        isHome: match.isHome ?? null,
        won: match.won,
      }));
    });
  });

  availableQuarters = computed<number[]>(() => {
    const set = new Set<number>();
    for (const row of [...this.allOwnPlays(), ...this.allOpponentPlays()]) {
      if (typeof row.quarter === 'number' && Number.isFinite(row.quarter)) {
        set.add(row.quarter);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  });

  availableOnCourtPlayers = computed<string[]>(() => {
    const counts = new Map<string, number>();
    for (const row of [...this.allOwnPlays(), ...this.allOpponentPlays()]) {
      for (const playerId of row.ownLineup || []) {
        counts.set(playerId, (counts.get(playerId) || 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([playerId]) => playerId)
      .slice(0, 20);
  });

  ownFilteredPlays = computed(() => this.applyCommonFilters(this.allOwnPlays()));
  opponentFilteredPlays = computed(() => this.applyCommonFilters(this.allOpponentPlays()));

  ownPaginatedPlays = computed(() => {
    const all = this.ownFilteredPlays();
    const start = (this.ownPage() - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });

  opponentPaginatedPlays = computed(() => {
    const all = this.opponentFilteredPlays();
    const start = (this.opponentPage() - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });

  filteredQuintets = computed<QuintetRow[]>(() => {
    const quintetMap = new Map<
      string,
      { playerIds: string[]; possessions: number; points: number }
    >();

    const plays = [...this.ownFilteredPlays(), ...this.opponentFilteredPlays()];
    for (const play of plays) {
      const lineup = Array.from(
        new Set((play.ownLineup || []).map((id) => String(id).trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b));

      if (lineup.length === 0) {
        continue;
      }

      const key = lineup.join('|');
      const current = quintetMap.get(key);
      if (!current) {
        quintetMap.set(key, {
          playerIds: lineup,
          possessions: 1,
          points: play.points || 0,
        });
        continue;
      }

      current.possessions += 1;
      current.points += play.points || 0;
    }

    const quintets = Array.from(quintetMap.values()).map((item) => ({
      playerIds: item.playerIds,
      possessions: item.possessions,
      points: item.points,
      pointsPerPossession: item.possessions ? item.points / item.possessions : 0,
    }));

    const totalPossessions = quintets.reduce((acc, item) => acc + item.possessions, 0);
    const totalPoints = quintets.reduce((acc, item) => acc + item.points, 0);
    const baselinePpp = totalPossessions ? totalPoints / totalPossessions : 0;

    return quintets.sort((a, b) => {
      const scoreA = this.quintetRankScore(a, baselinePpp);
      const scoreB = this.quintetRankScore(b, baselinePpp);

      return (
        scoreB - scoreA ||
        b.pointsPerPossession - a.pointsPerPossession ||
        b.possessions - a.possessions ||
        b.points - a.points
      );
    });
  });

  quintetsPaginated = computed(() => {
    const all = this.filteredQuintets();
    const start = (this.quintetsPage() - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly jobsStore: JobsStoreService,
    private readonly api: AnalysisApiService,
    private readonly imageAsset: ImageAssetService,
  ) {
    this.route.params.subscribe((params) => {
      const id = params['jobId'] || '';
      this.jobId.set(id);
      const job = id ? this.jobsStore.getJob(id) : null;
      if (!id || !job) {
        this.router.navigate(['/jobs']);
        return;
      }

      const resultRequestTeamId = String((job as any)?.result?.request?.teamId || '').trim();
      const teamId = (job.selectedTeamId || resultRequestTeamId || '').trim();
      if (teamId) {
        this.api.getTeamPlayers(teamId).subscribe({
          next: (res) => {
            const map: Record<string, { name: string; photoUrl: string }> = {
              ...this.playerMap(),
            };
            for (const player of res.players || []) {
              map[player.playerId] = {
                name: player.name,
                photoUrl: player.photoUrl,
              };
            }
            this.playerMap.set(map);
          },
          error: () => undefined,
        });

        const matchIdsFromResult = (
          ((job as any)?.result?.matches || []) as Array<{
            matchId?: string | number;
          }>
        )
          .map((m) => Number(m?.matchId))
          .filter((id) => Number.isFinite(id) && id > 0);

        if (matchIdsFromResult.length > 0) {
          this.api.getActionPlayers(teamId, matchIdsFromResult).subscribe({
            next: (res) => {
              const map: Record<string, { name: string; photoUrl: string }> = {
                ...this.playerMap(),
              };
              for (const player of res.players || []) {
                map[player.playerId] = {
                  name: player.name,
                  photoUrl: player.photoUrl,
                };
              }
              this.playerMap.set(map);
            },
            error: () => undefined,
          });
        }
      }
    });
  }

  private applyCommonFilters(rows: FilterablePlay[]): FilterablePlay[] {
    return rows.filter((item) => {
      const text = this.playFilter().trim().toLowerCase();
      if (text) {
        const haystack = `${item.description || ''} ${item.changeReason || ''}`.toLowerCase();
        if (!haystack.includes(text)) {
          return false;
        }
      }

      const homeAway = this.homeAwayFilter();
      if (homeAway === 'home' && item.isHome !== true) {
        return false;
      }
      if (homeAway === 'away' && item.isHome !== false) {
        return false;
      }

      const outcome = this.outcomeFilter();
      if (outcome === 'won' && item.won !== true) {
        return false;
      }
      if (outcome === 'lost' && item.won !== false) {
        return false;
      }

      const quarter = this.quarterFilter();
      if (quarter !== 'all' && item.quarter !== quarter) {
        return false;
      }

      const players = this.selectedPlayerIds();
      if (players.length > 0) {
        const lineup = item.ownLineup || [];
        const containsAll = players.every((playerId) => lineup.includes(playerId));
        if (!containsAll) {
          return false;
        }
      }

      return true;
    });
  }

  displayTeamName(): string {
    const job = this.job();
    if (!job) {
      return '-';
    }

    const preferredName = (job.selectedTeamName || '').trim();
    if (preferredName && !/^\d+$/.test(preferredName)) {
      return preferredName;
    }

    const legacyValue = (job.selectedTeam || '').trim();
    if (legacyValue && !/^\d+$/.test(legacyValue)) {
      return legacyValue;
    }

    return 'Equipo seleccionado';
  }

  playerLabel(playerId: string): string {
    const player = this.playerMap()[playerId];
    return player?.name || 'Jugadora';
  }

  playerPhoto(playerId: string): string | null {
    const player = this.playerMap()[playerId];
    return player?.photoUrl ? this.imageAsset.getPlayerPhoto(player.photoUrl) : null;
  }

  onPlayerImageError(playerId: string): void {
    const current = this.playerMap();
    const player = current[playerId];
    if (!player) {
      return;
    }

    this.playerMap.set({
      ...current,
      [playerId]: {
        ...player,
        photoUrl: '',
      },
    });
  }

  isPlayerSelected(playerId: string): boolean {
    return this.selectedPlayerIds().includes(playerId);
  }

  togglePlayerFilter(playerId: string): void {
    const current = this.selectedPlayerIds();
    if (current.includes(playerId)) {
      this.selectedPlayerIds.set(current.filter((id) => id !== playerId));
    } else {
      this.selectedPlayerIds.set([...current, playerId]);
    }
    this.resetPagination();
  }

  clearPlayerFilter(): void {
    this.selectedPlayerIds.set([]);
    this.resetPagination();
  }

  setPlayFilter(value: string): void {
    this.playFilter.set(value || '');
    this.resetPagination();
  }

  setHomeAwayFilter(value: HomeAwayFilter): void {
    this.homeAwayFilter.set(value);
    this.resetPagination();
  }

  setOutcomeFilter(value: OutcomeFilter): void {
    this.outcomeFilter.set(value);
    this.resetPagination();
  }

  setQuarterFilter(value: number | 'all'): void {
    this.quarterFilter.set(value);
    this.resetPagination();
  }

  refreshResult(): void {
    const id = this.jobId();
    if (!id) return;
    this.jobsStore.getJobResult(id).catch(() => undefined);
  }

  resetPagination(): void {
    this.ownPage.set(1);
    this.opponentPage.set(1);
    this.quintetsPage.set(1);
  }

  ownPointsTotal(): number {
    return this.ownFilteredPlays().reduce((acc, item) => acc + (item.points || 0), 0);
  }

  opponentPointsTotal(): number {
    return this.opponentFilteredPlays().reduce((acc, item) => acc + (item.points || 0), 0);
  }

  ownPpp(): number {
    const total = this.ownFilteredPlays().length;
    return total ? this.ownPointsTotal() / total : 0;
  }

  opponentPpp(): number {
    const total = this.opponentFilteredPlays().length;
    return total ? this.opponentPointsTotal() / total : 0;
  }

  formatPpp(value: number): string {
    return value.toFixed(2);
  }

  ownTotalPages(): number {
    return Math.max(1, Math.ceil(this.ownFilteredPlays().length / this.pageSize));
  }

  opponentTotalPages(): number {
    return Math.max(1, Math.ceil(this.opponentFilteredPlays().length / this.pageSize));
  }

  quintetsTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredQuintets().length / this.pageSize));
  }

  prevOwnPage(): void {
    if (this.ownPage() > 1) {
      this.ownPage.set(this.ownPage() - 1);
    }
  }

  nextOwnPage(): void {
    if (this.ownPage() < this.ownTotalPages()) {
      this.ownPage.set(this.ownPage() + 1);
    }
  }

  prevOpponentPage(): void {
    if (this.opponentPage() > 1) {
      this.opponentPage.set(this.opponentPage() - 1);
    }
  }

  nextOpponentPage(): void {
    if (this.opponentPage() < this.opponentTotalPages()) {
      this.opponentPage.set(this.opponentPage() + 1);
    }
  }

  prevQuintetsPage(): void {
    if (this.quintetsPage() > 1) {
      this.quintetsPage.set(this.quintetsPage() - 1);
    }
  }

  nextQuintetsPage(): void {
    if (this.quintetsPage() < this.quintetsTotalPages()) {
      this.quintetsPage.set(this.quintetsPage() + 1);
    }
  }

  translateType(changeReason: string): string {
    const reason = (changeReason || '').trim();
    switch (reason) {
      case 'made_field_goal':
        return 'Canasta';
      case 'made_last_free_throw':
        return 'TL anotado';
      case 'turnover':
        return 'Pérdida';
      case 'defensive_rebound_after_miss':
        return 'Rebote defensivo';
      case 'period_start':
        return 'Inicio de cuarto';
      default:
        return reason || '-';
    }
  }

  formatQuintet(playerIds: string[]): string {
    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return '-';
    }

    return playerIds.map((playerId) => this.playerLabel(playerId)).join(' · ');
  }

  private quintetRankScore(item: QuintetRow, baselinePpp: number): number {
    // Suavizado bayesiano: combina PPP observado con un prior global para
    // reducir el sesgo de quintetos con muy pocas posesiones.
    const priorPossessions = 4;
    return (item.points + baselinePpp * priorPossessions) / (item.possessions + priorPossessions);
  }

  exportJson(): void {
    const job = this.job();
    if (!job?.result) return;
    this.downloadFile(
      `job-${job.jobId}.json`,
      'application/json;charset=utf-8',
      JSON.stringify(job.result, null, 2),
    );
  }

  exportCsv(): void {
    const ownRows = this.ownFilteredPlays();
    const oppRows = this.opponentFilteredPlays();
    const lines = [
      'side,index,quarter,clock,points,changeReason,description',
      ...ownRows.map(
        (r) =>
          `own_offense,${r.index},${r.quarter ?? ''},${r.clock ?? ''},${r.points},"${(r.changeReason || '').replace(/"/g, '""')}","${(r.description || '').replace(/"/g, '""')}"`,
      ),
      ...oppRows.map(
        (r) =>
          `opponent_offense,${r.index},${r.quarter ?? ''},${r.clock ?? ''},${r.points},"${(r.changeReason || '').replace(/"/g, '""')}","${(r.description || '').replace(/"/g, '""')}"`,
      ),
    ];

    this.downloadFile('jugadas-filtradas.csv', 'text/csv;charset=utf-8', lines.join('\n'));
  }

  private downloadFile(filename: string, mime: string, content: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString('es-ES');
  }
}
