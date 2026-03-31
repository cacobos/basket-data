const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  try {
    let mod;
    try {
      mod = require("./dist/index.js");
    } catch (e1) {
      try {
        mod = await import(pathToFileURL(path.resolve("./dist/index.js")).href);
      } catch (e2) {
        throw new Error("No se pudo cargar ./dist/index.js\nrequire error:\n" + e1.stack + "\nimport error:\n" + e2.stack);
      }
    }

    const { getFebLeagues, getFebLeagueTeams } = mod;
    if (typeof getFebLeagues !== "function" || typeof getFebLeagueTeams !== "function") {
      throw new Error("Exportaciones faltantes en ./dist/index.js (se esperaba getFebLeagues y getFebLeagueTeams)");
    }

    const leagues = await getFebLeagues();
    fs.writeFileSync("feb-leagues-list.json", JSON.stringify(leagues, null, 2));

    const teamsDefault = await getFebLeagueTeams(2, 2025, "segundafeb");
    fs.writeFileSync("feb-league-teams-segundafeb-2-2025-default.json", JSON.stringify(teamsDefault, null, 2));

    const teams88879 = await getFebLeagueTeams(2, 2025, "segundafeb", 88879);
    fs.writeFileSync("feb-league-teams-segundafeb-2-2025-88879.json", JSON.stringify(teams88879, null, 2));

    const asTeams = (v) => Array.isArray(v) ? v : (Array.isArray(v?.teams) ? v.teams : (Array.isArray(v?.data) ? v.data : []));
    const getSelectedGroup = (v) => v?.groupId ?? v?.selectedGroupId ?? v?.group?.id ?? v?.grupo?.id ?? v?.filters?.groupId ?? null;
    const getAvailableGroups = (v) => {
      const g = v?.availableGroups ?? v?.groups ?? v?.grupos ?? v?.groupOptions ?? [];
      if (!Array.isArray(g)) return [];
      return g.map(x => typeof x === "object" ? (x.id ?? x.groupId ?? x.value ?? x.codigo ?? x.name ?? JSON.stringify(x)) : x);
    };

    const segundafebLeagues = (Array.isArray(leagues) ? leagues : []).filter(l => String(l?.slug ?? l?.name ?? l?.title ?? "").toLowerCase().includes("segundafeb"));
    const segundafebIds = segundafebLeagues.map(l => l?.leagueId ?? l?.id ?? l?.competitionId).filter(Boolean);

    const groupsAvailable = [...new Set([...getAvailableGroups(teamsDefault), ...getAvailableGroups(teams88879)].map(x => String(x)))];
    const selectedDefault = getSelectedGroup(teamsDefault);
    const selected88879 = getSelectedGroup(teams88879);

    console.log("RESUMEN", JSON.stringify({
      totalLigas: Array.isArray(leagues) ? leagues.length : 0,
      idsDetectadosSegundaFeb: segundafebIds,
      gruposDisponibles: groupsAvailable,
      grupoSeleccionadoDefault: selectedDefault,
      grupoSeleccionado88879: selected88879,
      equiposDefault: asTeams(teamsDefault).length,
      equipos88879: asTeams(teams88879).length
    }, null, 2));
  } catch (err) {
    console.error("ERROR_EXACTO:");
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
