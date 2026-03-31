import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ImageAssetService {
  private readonly imageProxyBase = 'http://localhost:3000/feb/image?url=';

  private readonly fallbackLeagueLogo = this.buildPlaceholder('Liga', '#0b6f7f');
  private readonly fallbackTeamShield = this.buildPlaceholder('Equipo', '#0f9e8f');
  private readonly fallbackPlayerPhoto = this.buildPlaceholder('Jugador', '#4f46e5');

  private readonly leagueLogos: Record<string, string> = {};

  private readonly teamShields: Record<string, string> = {};

  getLeagueLogo(leagueId: string): string {
    const raw =
      this.leagueLogos[leagueId] ||
      `https://imagenes.feb.es/Imagen.aspx?g=${encodeURIComponent(leagueId)}&t=2025`;
    return this.toProxyUrl(raw);
  }

  getTeamShield(teamId?: string): string {
    if (!teamId) return this.fallbackTeamShield;
    const remote =
      this.teamShields[teamId] || `https://imagenes.feb.es/Imagen.aspx?i=${teamId}&ti=1`;
    return this.toProxyUrl(remote);
  }

  getPlayerPhoto(photoUrl?: string): string {
    if (!photoUrl) return this.fallbackPlayerPhoto;
    const absolute = photoUrl.startsWith('/') ? `https://imagenes.feb.es${photoUrl}` : photoUrl;

    return this.toProxyUrl(absolute);
  }

  // Método para obtener URL de imagen con fallback y caché
  getImageUrl(url?: string, fallback?: string): string {
    return url || fallback || this.fallbackPlayerPhoto;
  }

  getLeagueFallback(leagueId?: string): string {
    return this.buildPlaceholder(`Liga ${leagueId || ''}`.trim(), '#0b6f7f');
  }

  getTeamFallback(teamId?: string): string {
    return this.buildPlaceholder(`Equipo ${teamId || ''}`.trim(), '#0f9e8f');
  }

  getPlayerFallback(name?: string): string {
    return this.buildPlaceholder(name || 'Jugador', '#4f46e5');
  }

  private buildPlaceholder(text: string, color: string): string {
    const safeText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .trim()
      .slice(0, 18);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><rect width='100%' height='100%' fill='${color}'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Segoe UI' font-size='20'>${safeText}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  private toProxyUrl(url: string): string {
    return `${this.imageProxyBase}${encodeURIComponent(url)}`;
  }
}
