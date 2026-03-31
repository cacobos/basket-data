import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ImageAssetService } from '../../services/image-asset.service';

@Component({
  selector: 'app-card-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="player-card">
      <div class="player-photo">
        <img [src]="photo" [alt]="name" (error)="onImageError()" />
      </div>
      <div class="player-info">
        <h3>{{ name }}</h3>
        <p class="player-number" *ngIf="number">#{{ number }}</p>
        <p class="player-position" *ngIf="position">{{ position }}</p>
        <p class="player-nationality" *ngIf="nationality">🌍 {{ nationality }}</p>
      </div>
    </div>
  `,
  styles: `
    .player-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 15px;
      background: white;
      border: 1px solid #eee;
      border-radius: 10px;
      transition: all 0.3s;
      min-width: 140px;
    }

    .player-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      transform: translateY(-2px);
    }

    .player-photo {
      width: 100%;
      aspect-ratio: 3/4;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border-radius: 8px;
      overflow: hidden;
    }

    .player-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .player-info h3 {
      margin: 0;
      font-size: 0.95rem;
      text-align: center;
    }

    .player-number,
    .player-position,
    .player-nationality {
      margin: 2px 0;
      font-size: 0.8rem;
      color: #666;
      text-align: center;
    }
  `,
})
export class CardPlayerComponent {
  @Input() name!: string;
  @Input() number?: string;
  @Input() position?: string;
  @Input() nationality?: string;
  @Input() photoUrl?: string;

  photo!: string;

  constructor(private imageAsset: ImageAssetService) {}

  ngOnInit(): void {
    this.photo = this.imageAsset.getPlayerPhoto(this.photoUrl);
  }

  onImageError(): void {
    this.photo = this.imageAsset.getPlayerFallback(this.name);
  }
}
