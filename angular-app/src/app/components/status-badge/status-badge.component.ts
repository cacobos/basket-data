import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [class]="'status-' + status" [title]="statusLabel">
      <span class="icon">{{ icon }}</span>
      {{ statusLabel }}
    </span>
  `,
  styles: `
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .icon {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-idle {
      background: #f0f0f0;
      color: #666;
    }

    .status-idle .icon {
      background: #999;
    }

    .status-queued {
      background: #fff3cd;
      color: #856404;
    }

    .status-queued .icon {
      background: #ffc107;
      animation: pulse 2s infinite;
    }

    .status-processing {
      background: #d1ecf1;
      color: #0c5460;
    }

    .status-processing .icon {
      background: #17a2b8;
      animation: pulse 1s infinite;
    }

    .status-completed {
      background: #d4edda;
      color: #155724;
    }

    .status-completed .icon {
      background: #28a745;
    }

    .status-failed {
      background: #f8d7da;
      color: #721c24;
    }

    .status-failed .icon {
      background: #dc3545;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `,
})
export class StatusBadgeComponent {
  @Input() status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed' = 'idle';

  get statusLabel(): string {
    const labels: Record<string, string> = {
      idle: 'Inactivo',
      queued: 'En Espera',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Error',
    };
    return labels[this.status] || 'Desconocido';
  }

  get icon(): string {
    const icons: Record<string, string> = {
      idle: '⭕',
      queued: '⏳',
      processing: '⚙️',
      completed: '✅',
      failed: '❌',
    };
    return icons[this.status] || '❓';
  }
}
