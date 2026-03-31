"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFebLeagues = getFebLeagues;
exports.getFebLeagueTeams = getFebLeagueTeams;
const cheerio_1 = require("cheerio");
const FEB_HOME_URL = "https://baloncestoenvivo.feb.es/home.aspx";
const FEB_BASE_URL = "https://baloncestoenvivo.feb.es";
function normalizeText(value) {
    return value.replace(/\s+/g, " ").trim();
}
function buildLeaguePageUrl(slug, leagueId, seasonId) {
    return `${FEB_BASE_URL}/estadisticas/${slug}/${leagueId}/${seasonId}`;
}
function parseLeaguesFromHome(html) {
    const regex = /https:\/\/baloncestoenvivo\.feb\.es\/estadisticas\.aspx\?g=(\d+)&(?:amp;)?t=(\d+)&(?:amp;)?nm=([a-z0-9]+)/gi;
    const unique = new Map();
    let match = regex.exec(html);
    while (match) {
        const [, leagueIdRaw, seasonIdRaw, slugRaw] = match;
        const leagueId = leagueIdRaw ?? "";
        const seasonId = seasonIdRaw ?? "";
        const slug = slugRaw ?? "";
        if (!leagueId || !seasonId || !slug) {
            match = regex.exec(html);
            continue;
        }
        const key = `${leagueId}:${seasonId}:${slug}`;
        if (!unique.has(key)) {
            unique.set(key, {
                leagueId,
                seasonId,
                slug,
                statsUrl: buildLeaguePageUrl(slug, leagueId, seasonId),
            });
        }
        match = regex.exec(html);
    }
    return Array.from(unique.values()).sort((a, b) => Number(a.leagueId) - Number(b.leagueId));
}
function readAspNetFormState(html, seasonId) {
    const $ = (0, cheerio_1.load)(html);
    const formAction = $("form").attr("action")?.trim() ?? "";
    const eventTarget = $("#__EVENTTARGET").attr("value") ?? "";
    const eventArgument = $("#__EVENTARGUMENT").attr("value") ?? "";
    const lastFocus = $("#__LASTFOCUS").attr("value") ?? "";
    const viewState = $("#__VIEWSTATE").attr("value") ?? "";
    const viewStateGenerator = $("#__VIEWSTATEGENERATOR").attr("value") ?? "";
    const eventValidation = $("#__EVENTVALIDATION").attr("value") ?? "";
    const token = $("#_ctl0_token").attr("value") ?? "";
    const seasonSelect = $("#_ctl0_MainContentPlaceHolderMaster_temporadasDropDownList");
    const seasonFieldName = seasonSelect.attr("name") ?? "_ctl0:MainContentPlaceHolderMaster:temporadasDropDownList";
    const seasonValue = seasonSelect.val()?.toString() ?? seasonId;
    const groupSelect = $("#_ctl0_MainContentPlaceHolderMaster_fasesGruposDropDownList");
    const groupFieldName = groupSelect.attr("name") ?? "_ctl0:MainContentPlaceHolderMaster:fasesGruposDropDownList";
    if (!viewState || !eventValidation || !formAction || !groupSelect.length) {
        throw new Error("No se pudo leer el estado ASP.NET de la página de estadísticas.");
    }
    return {
        action: formAction,
        eventTarget,
        eventArgument,
        lastFocus,
        viewState,
        viewStateGenerator,
        eventValidation,
        token,
        seasonFieldName,
        seasonValue,
        groupFieldName,
    };
}
function parseGroups(html) {
    const $ = (0, cheerio_1.load)(html);
    const groupSelect = $("#_ctl0_MainContentPlaceHolderMaster_fasesGruposDropDownList");
    return groupSelect
        .find("option")
        .map((_, option) => ({
        groupId: ($(option).attr("value") ?? "").trim(),
        name: normalizeText($(option).text()),
        selected: $(option).is(":selected"),
    }))
        .get()
        .filter((item) => item.groupId.length > 0);
}
function parseTeams(html) {
    const $ = (0, cheerio_1.load)(html);
    const teamMap = new Map();
    $("a[href*='Equipo.aspx?i=']").each((_, anchor) => {
        const href = $(anchor).attr("href") ?? "";
        const idMatch = href.match(/[?&]i=(\d+)/i);
        if (!idMatch) {
            return;
        }
        const teamId = idMatch[1] ?? "";
        if (!teamId) {
            return;
        }
        const name = normalizeText($(anchor).text());
        if (!name) {
            return;
        }
        if (!teamMap.has(teamId)) {
            const absoluteUrl = href.startsWith("http") ? href : `${FEB_BASE_URL}/${href.replace(/^\/+/, "")}`;
            teamMap.set(teamId, {
                teamId,
                name,
                teamUrl: absoluteUrl,
            });
        }
    });
    return Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
async function fetchLeaguePage(slug, leagueId, seasonId) {
    const response = await fetch(buildLeaguePageUrl(slug, leagueId, seasonId));
    if (!response.ok) {
        throw new Error(`No se pudo cargar la liga (${response.status}).`);
    }
    return response.text();
}
async function postLeagueGroup(html, seasonId, groupId) {
    const state = readAspNetFormState(html, seasonId);
    const actionUrl = state.action.startsWith("http") ? state.action : `${FEB_BASE_URL}${state.action}`;
    const payload = new URLSearchParams();
    payload.set("__EVENTTARGET", "_ctl0$MainContentPlaceHolderMaster$fasesGruposDropDownList");
    payload.set("__EVENTARGUMENT", state.eventArgument);
    payload.set("__LASTFOCUS", state.lastFocus);
    payload.set("__VIEWSTATE", state.viewState);
    payload.set("__VIEWSTATEGENERATOR", state.viewStateGenerator);
    payload.set("__EVENTVALIDATION", state.eventValidation);
    if (state.token) {
        payload.set("_ctl0:token", state.token);
    }
    payload.set(state.seasonFieldName, state.seasonValue);
    payload.set(state.groupFieldName, groupId);
    const response = await fetch(actionUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
    });
    if (!response.ok) {
        throw new Error(`No se pudo cambiar de grupo (${response.status}).`);
    }
    return response.text();
}
async function getFebLeagues() {
    const response = await fetch(FEB_HOME_URL);
    if (!response.ok) {
        throw new Error(`No se pudo cargar Home (${response.status}).`);
    }
    const html = await response.text();
    return parseLeaguesFromHome(html);
}
async function getFebLeagueTeams(leagueId, seasonId, slug, groupId) {
    const normalizedLeagueId = String(leagueId).trim();
    const normalizedSeasonId = String(seasonId).trim();
    const normalizedSlug = String(slug).trim().toLowerCase();
    const normalizedGroupId = groupId == null ? "" : String(groupId).trim();
    if (!/^\d+$/.test(normalizedLeagueId)) {
        throw new Error("leagueId debe ser numérico.");
    }
    if (!/^\d+$/.test(normalizedSeasonId)) {
        throw new Error("seasonId debe ser numérico.");
    }
    if (!/^[a-z0-9]+$/.test(normalizedSlug)) {
        throw new Error("slug no válido.");
    }
    let html = await fetchLeaguePage(normalizedSlug, normalizedLeagueId, normalizedSeasonId);
    let groups = parseGroups(html);
    if (normalizedGroupId) {
        const exists = groups.some((group) => group.groupId === normalizedGroupId);
        if (!exists) {
            throw new Error(`groupId ${normalizedGroupId} no existe para esta liga/temporada.`);
        }
        const selected = groups.find((group) => group.selected)?.groupId ?? "";
        if (selected !== normalizedGroupId) {
            html = await postLeagueGroup(html, normalizedSeasonId, normalizedGroupId);
            groups = parseGroups(html);
        }
    }
    const selectedGroupId = groups.find((group) => group.selected)?.groupId ?? groups[0]?.groupId ?? "";
    const teams = parseTeams(html);
    return {
        leagueId: normalizedLeagueId,
        seasonId: normalizedSeasonId,
        slug: normalizedSlug,
        selectedGroupId,
        groups,
        teams,
    };
}
//# sourceMappingURL=febLeagues.js.map