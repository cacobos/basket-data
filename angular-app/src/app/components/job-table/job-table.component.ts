import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
            <th>Rival</th>
            <th>Jugadores</th>
            <th>Estado</th>
            <th>Creado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let job of jobs" [class.completed]="job.status === 'completed'">
            <td>{{ displayTeamName(job) }}</td>
            <td>{{ job.opponent_team_id ? 'Rival seleccionado' : '-' }}</td>
            <td class="player-count">{{ job.selectedPlayers.length }} jugador(es)</td>
            <td>
              <app-status-badge [status]="job.status"></app-status-badge>
            </td>
            <td class="created-at">{{ formatDate(job.createdAt) }}</td>
            <td class="actions">
              <a
                class="btn-detail"
                [routerLink]="['/jobs', job.jobId]"
                *ngIf="job.status === 'completed' || job.status === 'failed'"
                title="Ver detalle"
              >
                👁️ Ver
              </a>
              <button class="btn-delete" (click)="onDelete.emit(job.jobId)" title="Eliminar">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyState>
        <div class="empty-state">
          <p>📭 No hay trabajos aún</p>
          <p class="hint">Comienza en el Analizador</p>
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

    .created-at {
      font-size: 0.9rem;
      color: #999;
    }

    .actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-detail,
    .btn-delete {
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

    .btn-delete {
      color: #dc3545;
    }

    .btn-delete:hover {
      background: #fff5f5;
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
  @Output() onDelete = new EventEmitter<string>();

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
