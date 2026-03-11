// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawResult {
    result_id: number;
    bib: number;
    age_at_race: number | null;
    swim: string | null;
    t1: string | null;
    bike: string | null;
    t2: string | null;
    run: string | null;
    chip_elapsed: string | null;
    overall_rank: number | null;
    athletes: {
        id: number;
        name: string;
        team: string | null;
        city: string | null;
        gender: string | null;
    };
    races: {
        id: number;
        name: string;
        date: string | null;
        type: string | null;
        location: string | null;
    };
}

export interface DisplayRow {
    result_id: number;
    bib: number;
    name: string;
    team: string | null;
    gender: string | null;
    age_at_race: number | null;
    age_group: string | null;
    race_name: string;
    race_date: string | null;
    chip_ms: number;
    swim_ms: number | null;
    t1_ms: number | null;
    bike_ms: number | null;
    t2_ms: number | null;
    run_ms: number | null;
    overall_rank: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SANTA_CLARA_NAMES = new Set([
    "SANTA CLARA",
    "SANTA CLARA UNIVERSITY",
    "SCU",
]);

export const SWIM_KM = 0.4;
export const BIKE_KM = 20;
export const RUN_KM  = 5;

export const PAGE_SIZES = [25, 50, 100];

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
    const chip_ms = intervalToMs(r.chip_elapsed);
    if (chip_ms === null) return null;
    const g   = r.athletes.gender ?? "";
    const age = r.age_at_race;
    let age_group: string | null = null;
    if (age && g) {
        if (age <= 19) age_group = `${g}18-19`;
        else {
            const lo = Math.floor(age / 5) * 5;
            age_group = `${g}${lo}-${lo + 4}`;
        }
    }
    return {
        result_id:    r.result_id,
        bib:          r.bib,
        name:         r.athletes.name,
        team:         r.athletes.team,
        gender:       r.athletes.gender,
        age_at_race:  age,
        age_group,
        race_name:    r.races.name,
        race_date:    r.races.date,
        chip_ms,
        swim_ms:      intervalToMs(r.swim),
        t1_ms:        intervalToMs(r.t1),
        bike_ms:      intervalToMs(r.bike),
        t2_ms:        intervalToMs(r.t2),
        run_ms:       intervalToMs(r.run),
        overall_rank: r.overall_rank,
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

export function swimPaceStr(ms: number | null): string {
    if (!ms) return "—";
    return `${formatTime(ms / (SWIM_KM * 10))}/100m`;
}

export function bikePaceStr(ms: number | null): string {
    if (!ms) return "—";
    return `${(BIKE_KM / (ms / 3_600_000)).toFixed(1)} km/h`;
}

export function runPaceStr(ms: number | null): string {
    if (!ms) return "—";
    return `${formatTime(ms / RUN_KM)}/km`;
}
