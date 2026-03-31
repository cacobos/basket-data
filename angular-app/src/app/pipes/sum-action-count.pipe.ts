import { Pipe, PipeTransform } from '@angular/core';

interface PlayerWithCount {
  actions_count?: number;
}

@Pipe({
  name: 'sumActionCount',
  standalone: true,
})
export class SumActionCountPipe implements PipeTransform {
  transform(players: PlayerWithCount[]): number {
    return players.reduce((sum, player) => sum + (player.actions_count || 0), 0);
  }
}
