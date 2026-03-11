// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawResult {
    result_id: number;
    athlete_bib: number;
    athlete_age: number | null;
    athlete_division: string;
    time_swim: string | null;
    time_t1: string | null;
    time_bike: string | null;
    time_t2: string | null;
    time_run: string | null;
    time_chip: string | null;
    athletes: {
        id: number;
        name: string;
        team: string | null;
        city: string | null;
        gender: string | null;
    };
    races: {
        id: number;
        race_name: string;
        race_date: string | null;
        race_type: string | null;
        race_location: string | null;
        meters_swim: number | null;
        meters_bike: number | null;
        meters_run: number | null;
    };
}

export interface DisplayRow {
    result_id: number;
    bib: number;
    division: string;
    name: string;
    team: string | null;
    gender: string | null;
    age_at_race: number | null;
    age_group: string | null;
    race_name: string;
    race_date: string | null;
    race_type: string | null;
    race_location: string | null;
    race_swim_km: number | null;
    race_bike_km: number | null;
    race_run_km: number | null;
    chip_ms: number;
    swim_ms: number | null;
    t1_ms: number | null;
    bike_ms: number | null;
    t2_ms: number | null;
    run_ms: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SANTA_CLARA_NAMES = new Set([
    "SANTA CLARA",
    "SANTA CLARA UNIVERSITY",
    "SCU",
]);

export const PAGE_SIZES = [25, 50, 100];

export const DEFAULT_SWIM_KM = 0.4;
export const DEFAULT_BIKE_KM = 20;
export const DEFAULT_RUN_KM  = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isSantaClara(team: string | null | undefined): boolean {
    if (!team) return false;
    return SANTA_CLARA_NAMES.has(team.trim().toUpperCase());
}

export function pad(n: number) { return n.toString().padStart(2, "0"); }

export function intervalToMs(iv: string | null | undefined): number | null {
    if (!iv) return null;
    const parts = iv.split(":");
    try {
        if (parts.length === 3) {
            const h = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            const s = parseFloat(parts[2]);
            return Math.round((h * 3600 + m * 60 + s) * 1000);
        }
    } catch { /* fall through */ }
    return null;
}

export function toDisplayRow(r: RawResult): DisplayRow | null {
    const chip_ms = intervalToMs(r.time_chip);
    if (chip_ms === null) return null;
    const g   = r.athletes.gender ?? "";
    const age = r.athlete_age;
    let age_group: string | null = null;
    if (age && g) {
        if (age <= 19) age_group = `${g}18-19`;
        else {
            const lo = Math.floor(age / 5) * 5;
            age_group = `${g}${lo}-${lo + 4}`;
        }
    }
    return {
        result_id:      r.result_id,
        bib:            r.athlete_bib,
        division:       r.athlete_division,
        name:           r.athletes.name,
        team:           r.athletes.team,
        gender:         r.athletes.gender,
        age_at_race:    age,
        age_group,
        race_name:      r.races.race_name,
        race_date:      r.races.race_date,
        race_type:      r.races.race_type,
        race_location:  r.races.race_location,
        race_swim_km:   r.races.meters_swim ? r.races.meters_swim / 1000 : null,
        race_bike_km:   r.races.meters_bike ? r.races.meters_bike / 1000 : null,
        race_run_km:    r.races.meters_run ? r.races.meters_run / 1000 : null,
        chip_ms,
        swim_ms:        intervalToMs(r.time_swim),
        t1_ms:          intervalToMs(r.time_t1),
        bike_ms:        intervalToMs(r.time_bike),
        t2_ms:          intervalToMs(r.time_t2),
        run_ms:         intervalToMs(r.time_run),
    };
}

export function median(nums: number[]): number {
    if (!nums.length) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid    = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid];
}

export function formatTime(ms: number): string {
    const s   = Math.floor(ms / 1000);
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function swimPaceStr(ms: number | null, swimKm: number | null = DEFAULT_SWIM_KM): string {
    if (!ms || !swimKm) return "—";
    return `${formatTime(ms / (swimKm * 10))}/100m`;
}

export function bikePaceStr(ms: number | null, bikeKm: number | null = DEFAULT_BIKE_KM): string {
    if (!ms || !bikeKm) return "—";
    return `${(bikeKm / (ms / 3_600_000)).toFixed(1)} km/h`;
}

export function runPaceStr(ms: number | null, runKm: number | null = DEFAULT_RUN_KM): string {
    if (!ms || !runKm) return "—";
    return `${formatTime(ms / runKm)}/km`;
}
