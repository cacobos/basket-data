import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobState } from '../../services/jobs-store.service';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-job-table',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="job-table-container">
      <table class="job-table" *ngIf="jobs.length > 0; else emptyState">
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Usuario</th>
            <th>Resumen</th>
            <th>Estado</th>
            <th>Creado</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let job of jobs" [class.completed]="job.status === 'completed'">
            <td>
              <div class="cell-stack">
                <strong>{{ displayTeamName(job) }}</strong>
                <span class="cell-meta">{{ displayTeamReference(job) }}</span>
              </div>
            </td>
            <td>
              <div class="cell-stack">
                <strong>{{ displayLauncher(job) }}</strong>
                <span class="cell-meta">{{ displayLauncherMeta(job) }}</span>
              </div>
            </td>
            <td>
              <div class="cell-stack">
                <strong>{{ displaySummary(job) }}</strong>
                <span class="cell-meta">{{ displaySelectionDetails(job) }}</span>
              </div>
            </td>
            <td>
              <app-status-badge [status]="job.status"></app-status-badge>
              <div class="status-note" *ngIf="job.errorMessage">{{ job.errorMessage }}</div>
              <div class="status-note" *ngIf="job.status === 'completed' && !job.errorMessage">
                Resultado listo
              </div>
            </td>
            <td class="created-at">{{ formatDate(job.createdAt) }}</td>
            <td class="actions">
              <a
                class="btn-detail"
                [routerLink]="['/busquedas', job.jobId]"
                *ngIf="job.status === 'completed' || job.status === 'failed'"
                title="Ver detalle"
              >
                👁️ Ver
              </a>
              <span *ngIf="job.status !== 'completed' && job.status !== 'failed'">-</span>
            </td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyState>
        <div class="empty-state">
          <p>📭 No hay busquedas todavia</p>
          <p class="hint">Empieza en Nueva busqueda</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: `
    .job-table-container {
      width: 100%;
      overflow-x: auto;
    }

    .job-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .job-table thead {
      background: #f5f5f5;
      border-bottom: 2px solid #ddd;
    }

    .job-table th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
    }

    .job-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
    }

    .job-table tbody tr {
      transition: background-color 0.3s;
    }

    .job-table tbody tr:hover {
      background-color: #fafafa;
    }

    .job-table tbody tr.completed {
      background-color: #f0f8ff;
    }

    .player-count {
      text-align: center;
      font-weight: 600;
      color: #667eea;
    }

    .cell-stack {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cell-meta {
      color: #6b7280;
      font-size: 0.85rem;
      line-height: 1.2;
    }

    .status-note {
      margin-top: 6px;
      color: #6b7280;
      font-size: 0.82rem;
      line-height: 1.3;
      max-width: 260px;
      word-break: break-word;
    }

    .created-at {
      font-size: 0.9rem;
      color: #999;
    }

    .actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-detail {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.3s;
      background: none;
      text-decoration: none;
    }

    .btn-detail {
      color: #667eea;
    }

    .btn-detail:hover {
      background: #f0f4ff;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .empty-state p {
      margin: 10px 0;
      font-size: 1.1rem;
    }

    .hint {
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .job-table th,
      .job-table td {
        padding: 8px 10px;
        font-size: 0.9rem;
      }

      .actions {
        gap: 4px;
      }
    }
  `,
})
export class JobTableComponent {
  @Input() jobs: JobState[] = [];

  displayTeamName(job: JobState): string {
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

  displayTeamReference(job: JobState): string {
    const teamId = (job.selectedTeamId || job.selectedTeam || '').trim();
    return teamId ? `ID ${teamId}` : 'Sin ID de equipo';
  }

  displayLauncher(job: JobState): string {
    const launcher = job.launchedBy;
    if (!launcher) {
      return 'Usuario desconocido';
    }

    const name = (launcher.displayName || '').trim();
    if (name) {
      return name;
    }

    const email = (launcher.email || '').trim();
    if (email) {
      return email;
    }

    const userId = (launcher.userId || '').trim();
    return userId || 'Usuario desconocido';
  }

  displayLauncherMeta(job: JobState): string {
    const launcher = job.launchedBy;
    if (!launcher) {
      return 'Sin datos de autor';
    }

    const pieces: string[] = [];
    if (launcher.email) {
      pieces.push(launcher.email);
    }
    if (launcher.provider) {
      pieces.push(launcher.provider);
    }

    return pieces.length > 0 ? pieces.join(' · ') : 'Autor registrado';
  }

  displaySummary(job: JobState): string {
    const matches = job.matchIds.length;
    const players = job.selectedPlayers.length;
    return `${matches} partido(s) · ${players} jugador(es)`;
  }

  displaySelectionDetails(job: JobState): string {
    const pieces: string[] = [];

    if (job.lineupMode) {
      pieces.push(`lineup ${job.lineupMode}`);
    }

    if (job.won_only) {
      pieces.push('solo victorias');
    }

    if (job.opponent_team_id) {
      pieces.push(`rival ${job.opponent_team_id}`);
    }

    return pieces.length > 0 ? pieces.join(' · ') : 'Busqueda sin filtros extra';
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
