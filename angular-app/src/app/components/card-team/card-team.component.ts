import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ImageAssetService } from '../../services/image-asset.service';

@Component({
  selector: 'app-card-team',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="team-card" [class.active]="isActive">
      <div class="team-shield">
        <img [src]="shield" [alt]="name" (error)="onImageError()" />
      </div>
      <div class="team-info">
        <h3>{{ name }}</h3>
        <p class="team-meta">Equipo FEB</p>
      </div>
    </div>
  `,
  styles: `
    .team-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 15px;
      background: white;
      border: 2px solid #ddd;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s;
      min-width: 160px;
    }

    .team-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      transform: translateY(-2px);
    }

    .team-card.active {
      border-color: #667eea;
      background: #f0f4ff;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .team-shield {
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .team-shield img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .team-info h3 {
      margin: 0;
      text-align: center;
      font-size: 0.95rem;
    }

    .team-meta {
      margin: 0;
      font-size: 0.8rem;
      color: #999;
      text-align: center;
    }
  `,
})
export class CardTeamComponent {
  @Input() teamId!: string;
  @Input() name!: string;
  @Input() isActive = false;

  shield!: string;

  constructor(private imageAsset: ImageAssetService) {}

  ngOnInit(): void {
    this.shield = this.imageAsset.getTeamShield(this.teamId);
  }

  onImageError(): void {
    this.shield = this.imageAsset.getTeamFallback(this.teamId);
  }
}
