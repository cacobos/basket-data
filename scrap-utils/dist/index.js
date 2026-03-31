"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitTeamPossessions = exports.getTeamPossessionReport = exports.getFebPossessionTimeline = exports.buildFebPossessionTimeline = exports.getFebPlayByPlay = exports.getFebLeagueTeams = exports.getFebLeagues = void 0;
exports.helloScrapUtils = helloScrapUtils;
const febPlayByPlay_1 = require("./febPlayByPlay");
const febPossessions_1 = require("./febPossessions");
var febLeagues_1 = require("./febLeagues");
Object.defineProperty(exports, "getFebLeagues", { enumerable: true, get: function () { return febLeagues_1.getFebLeagues; } });
Object.defineProperty(exports, "getFebLeagueTeams", { enumerable: true, get: function () { return febLeagues_1.getFebLeagueTeams; } });
var febPlayByPlay_2 = require("./febPlayByPlay");
Object.defineProperty(exports, "getFebPlayByPlay", { enumerable: true, get: function () { return febPlayByPlay_2.getFebPlayByPlay; } });
var febPossessions_2 = require("./febPossessions");
Object.defineProperty(exports, "buildFebPossessionTimeline", { enumerable: true, get: function () { return febPossessions_2.buildFebPossessionTimeline; } });
Object.defineProperty(exports, "getFebPossessionTimeline", { enumerable: true, get: function () { return febPossessions_2.getFebPossessionTimeline; } });
Object.defineProperty(exports, "getTeamPossessionReport", { enumerable: true, get: function () { return febPossessions_2.getTeamPossessionReport; } });
Object.defineProperty(exports, "splitTeamPossessions", { enumerable: true, get: function () { return febPossessions_2.splitTeamPossessions; } });
function helloScrapUtils() {
    return "scrap-utils listo";
}
if (require.main === module) {
    void (async () => {
        console.log(helloScrapUtils());
        const result = await (0, febPlayByPlay_1.getFebPlayByPlay)(2486496);
        console.log(`source=${result.source} events=${result.events.length}`);
        console.log(result.events.slice(0, 3));
        const possessions = await (0, febPossessions_1.getFebPossessionTimeline)(2486496);
        console.log(`possessions=${possessions.length}`);
        console.log(possessions.slice(0, 3));
    })();
}
//# sourceMappingURL=index.js.map