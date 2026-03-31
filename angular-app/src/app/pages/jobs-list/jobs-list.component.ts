import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JobTableComponent } from '../../components/job-table/job-table.component';
import { JobsStoreService } from '../../services/jobs-store.service';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [CommonModule, JobTableComponent, FormsModule],
  template: `
    <div class="jobs-list-container">
      <header class="jobs-header">
        <h1>📋 Historial de Trabajos</h1>
        <p>Visualiza todos tus análisis y sus resultados</p>
      </header>

      <div class="filters">
        <div class="filter-group">
          <label>Filtrar por estado:</label>
          <select [(ngModel)]="selectedStatus" (change)="onFilterChange()">
            <option value="">Todos</option>
            <option value="idle">Inactivo</option>
            <option value="queued">En Espera</option>
            <option value="processing">Procesando</option>
            <option value="completed">Completado</option>
            <option value="failed">Error</option>
          </select>
        </div>

        <div class="filter-stats">
          <span class="stat">Total: {{ allJobs().length }}</span>
          <span class="stat">Completados: {{ completedCount() }}</span>
          <span class="stat">Errores: {{ failedCount() }}</span>
        </div>

        <button class="btn-clear" (click)="onClearAll()" *ngIf="allJobs().length > 0">
          🗑️ Limpiar Historial
        </button>
      </div>

      <div class="jobs-content">
        <app-job-table [jobs]="filteredJobs()" (onDelete)="onDeleteJob($event)"></app-job-table>
      </div>
    </div>
  `,
  styles: `
    .jobs-list-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .jobs-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .jobs-header h1 {
      margin: 0 0 10px 0;
      font-size: 2.5rem;
    }

    .jobs-header p {
      margin: 0;
      color: #666;
      font-size: 1.1rem;
    }

    .filters {
      display: flex;
      gap: 20px;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 12px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .filter-group label {
      font-weight: 600;
      color: #333;
    }

    .filter-group select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 1rem;
      min-width: 150px;
    }

    .filter-stats {
      display: flex;
      gap: 15px;
      margin-left: auto;
    }

    .stat {
      padding: 8px 12px;
      background: white;
      border-radius: 6px;
      font-weight: 600;
      color: #667eea;
    }

    .btn-clear {
      padding: 8px 16px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }

    .btn-clear:hover {
      background: #c82333;
    }

    .jobs-content {
      background: white;
      border-radius: 12px;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .filters {
        flex-direction: column;
        gap: 15px;
      }

      .filter-stats {
        margin-left: 0;
        width: 100%;
        justify-content: space-between;
      }

      .stat {
        flex: 1;
        text-align: center;
      }
    }
  `,
})
export class JobsListComponent {
  selectedStatus = '';

  filteredJobs = computed(() => {
    if (!this.selectedStatus) {
      return this.allJobs();
    }
    return this.allJobs().filter((j) => j.status === this.selectedStatus);
  });

  completedCount = computed(() => this.allJobs().filter((j) => j.status === 'completed').length);

  failedCount = computed(() => this.allJobs().filter((j) => j.status === 'failed').length);

  constructor(private jobsStore: JobsStoreService) {}

  allJobs() {
    return this.jobsStore.jobs();
  }

  onFilterChange(): void {
    // Computed se actualiza automáticamente
  }

  onDeleteJob(jobId: string): void {
    if (confirm('¿Eliminar este trabajo?')) {
      this.jobsStore.deleteJob(jobId);
    }
  }

  onClearAll(): void {
    if (confirm('¿Limpiar TODO el historial?')) {
      this.jobsStore.clearAll();
    }
  }
}
