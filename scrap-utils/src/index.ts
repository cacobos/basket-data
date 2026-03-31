import { getFebPlayByPlay } from "./febPlayByPlay";
import { getFebPossessionTimeline } from "./febPossessions";

export { getFebLeagues, getFebLeagueTeams } from "./febLeagues";
export type { FebLeague, FebLeagueGroup, FebLeagueTeam, FebLeagueTeamsResult } from "./febLeagues";
export { getFebPlayByPlay } from "./febPlayByPlay";
export type { FebPlayByPlayEvent, FebPlayByPlayResult, PlayByPlaySource } from "./febPlayByPlay";
export {
    buildFebPossessionTimeline,
    getFebPossessionTimeline,
    getTeamPossessionReport,
    splitTeamPossessions
} from "./febPossessions";
export type {
    FebPossessionItem,
    PossessionChangeReason,
    PossessionResultType,
    TeamPossessionItem,
    TeamPossessionReport,
    TeamPossessionSide
} from "./febPossessions";

export function helloScrapUtils(): string {
  return "scrap-utils listo";
}

if (require.main === module) {
  void (async () => {
    console.log(helloScrapUtils());
    const result = await getFebPlayByPlay(2486496);
    console.log(`source=${result.source} events=${result.events.length}`);
    console.log(result.events.slice(0, 3));
    const possessions = await getFebPossessionTimeline(2486496);
    console.log(`possessions=${possessions.length}`);
    console.log(possessions.slice(0, 3));
  })();
}
