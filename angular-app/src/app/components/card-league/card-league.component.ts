import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ImageAssetService } from '../../services/image-asset.service';

@Component({
  selector: 'app-card-league',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="league-card" [class.active]="isActive">
      <div class="league-logo">
        <img [src]="logo" [alt]="name" (error)="onImageError()" />
      </div>
      <div class="league-info">
        <h3>{{ name }}</h3>
        <p class="league-meta">Temporada actual</p>
      </div>
    </div>
  `,
  styles: `
    .league-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 20px;
      background: white;
      border: 2px solid #ddd;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s;
      min-width: 200px;
    }

    .league-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      transform: translateY(-2px);
    }

    .league-card.active {
      border-color: #667eea;
      background: #f0f4ff;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .league-logo {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .league-logo img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .league-info h3 {
      margin: 0;
      text-align: center;
      font-size: 1rem;
    }

    .league-meta {
      margin: 0;
      font-size: 0.85rem;
      color: #999;
      text-align: center;
    }
  `,
})
export class CardLeagueComponent {
  @Input() leagueId!: string;
  @Input() name!: string;
  @Input() isActive = false;

  logo!: string;

  constructor(private imageAsset: ImageAssetService) {}

  ngOnInit(): void {
    this.logo = this.imageAsset.getLeagueLogo(this.leagueId);
  }

  onImageError(): void {
    this.logo = this.imageAsset.getLeagueFallback(this.leagueId);
  }
}
