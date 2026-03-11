"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape returned by Supabase join query */
interface RawResult {
    result_id: number;
    bib: number;
    age_at_race: number | null;
    swim: string | null;        // INTERVAL → "HH:MM:SS"
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

/** Flat display record — all times already in ms */
interface DisplayRow {
    result_id: number;
    bib: number;
    name: string;
    team: string | null;
    gender: string | null;
    age_at_race: number | null;
    age_group: string | null;   // computed client-side
    race_name: string;
    chip_ms: number;
    swim_ms: number | null;
    t1_ms: number | null;
    bike_ms: number | null;
    t2_ms: number | null;
    run_ms: number | null;
    overall_rank: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SANTA_CLARA_NAMES = new Set([
    "SANTA CLARA",
    "SANTA CLARA UNIVERSITY",
    "SCU",
]);

function isSantaClara(team: string | null | undefined): boolean {
    if (!team) return false;
    return SANTA_CLARA_NAMES.has(team.trim().toUpperCase());
}

function intervalToMs(iv: string | null | undefined): number | null {
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

function toDisplayRow(r: RawResult): DisplayRow | null {
    const chip_ms = intervalToMs(r.chip_elapsed);
    if (chip_ms === null) return null; // skip rows without a finish time
    const g = r.athletes.gender ?? "";
    const age = r.age_at_race;
    let age_group: string | null = null;
    if (age && g) {
        if (age <= 19)      age_group = `${g}18-19`;
        else {
            const lo = Math.floor(age / 5) * 5;
            age_group = `${g}${lo}-${lo + 4}`;
        }
    }
    return {
        result_id:   r.result_id,
        bib:         r.bib,
        name:        r.athletes.name,
        team:        r.athletes.team,
        gender:      r.athletes.gender,
        age_at_race: age,
        age_group,
        race_name:   r.races.name,
        chip_ms,
        swim_ms:     intervalToMs(r.swim),
        t1_ms:       intervalToMs(r.t1),
        bike_ms:     intervalToMs(r.bike),
        t2_ms:       intervalToMs(r.t2),
        run_ms:      intervalToMs(r.run),
        overall_rank: r.overall_rank,
    };
}

const PAGE_SIZES = [25, 50, 100];

// Fixed distances for Treeathlon sprint format
const SWIM_KM = 0.4;
const BIKE_KM = 20;
const RUN_KM  = 5;

function pad(n: number) {
    return n.toString().padStart(2, "0");
}

function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function swimPaceStr(ms: number | null): string {
    if (!ms) return "—";
    return `${formatTime(ms / (SWIM_KM * 10))}/100m`;
}

function bikePaceStr(ms: number | null): string {
    if (!ms) return "—";
    return `${(BIKE_KM / (ms / 3_600_000)).toFixed(1)} km/h`;
}

function runPaceStr(ms: number | null): string {
    if (!ms) return "—";
    return `${formatTime(ms / RUN_KM)}/km`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    label, value, sub, accent,
}: {
    label: string; value: string; sub?: string; accent?: boolean;
}) {
    return (
        <div className={`rounded-xl border px-5 py-4 ${accent ? "border-maroon-700/60 bg-maroon-950/40" : "border-zinc-800 bg-zinc-900/60"}`}>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${accent ? "text-maroon-300" : "text-zinc-100"}`}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
        </div>
    );
}

// ─── Histogram ────────────────────────────────────────────────────────────────

function Histogram({ all, filtered }: { all: DisplayRow[]; filtered: DisplayRow[] }) {
    const BIN_MS = 10 * 60 * 1000;
    const times = all.map((r) => r.chip_ms);
    const minT = Math.floor(Math.min(...times) / BIN_MS) * BIN_MS;
    const maxT = Math.ceil(Math.max(...times) / BIN_MS) * BIN_MS;
    const numBins = Math.max((maxT - minT) / BIN_MS, 1);

    const bins = Array.from({ length: numBins }, (_, i) => {
        const lo = minT + i * BIN_MS;
        const hi = lo + BIN_MS;
        const inAll     = all.filter((r) => r.chip_ms >= lo && r.chip_ms < hi).length;
        const inFiltered = filtered.filter((r) => r.chip_ms >= lo && r.chip_ms < hi);
        const sc     = inFiltered.filter((r) => isSantaClara(r.team)).length;
        const others = inFiltered.length - sc;
        return { lo, all: inAll, others, sc };
    });

    const maxCount = Math.max(...bins.map((b) => b.all), 1);
    const W = 800, H = 150, PAD_B = 28;
    const barW = W / numBins - 2;

    return (
        <div>
            <div className="mb-3 flex items-start justify-between gap-4">
                <h3 className="text-sm font-semibold text-zinc-300">
                    Finish Time Distribution
                    <span className="ml-2 text-xs font-normal text-zinc-500">10-min bins</span>
                </h3>
                <div className="flex flex-shrink-0 items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-purple-600" />Others</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-maroon-500" />Santa Clara</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-zinc-600 opacity-40" />Filtered out</span>
                </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H + PAD_B}`} className="w-full" style={{ height: 190 }}>
                {bins.map((bin, i) => {
                    const x    = i * (W / numBins) + 1;
                    const allH = (bin.all    / maxCount) * H;
                    const scH  = (bin.sc     / maxCount) * H;
                    const othH = (bin.others / maxCount) * H;
                    return (
                        <g key={i}>
                            {bin.all > 0    && <rect x={x} y={H - allH}        width={barW} height={allH}  fill="#52525b" opacity={0.3}  rx={2} />}
                            {othH    > 0    && <rect x={x} y={H - othH - scH}  width={barW} height={othH}  fill="#7c3aed" opacity={0.85} rx={2} />}
                            {scH     > 0    && <rect x={x} y={H - scH}         width={barW} height={scH}   fill="#b35959" opacity={0.95} rx={2} />}
                            {i % 2 === 0 && (
                                <text x={x + barW / 2} y={H + PAD_B - 4} textAnchor="middle" fill="#71717a" fontSize={9}>
                                    {formatTime(bin.lo)}
                                </text>
                            )}
                        </g>
                    );
                })}
                <line x1={0} y1={H} x2={W} y2={H} stroke="#3f3f46" strokeWidth={1} />
            </svg>
        </div>
    );
}

// ─── Splits Chart ─────────────────────────────────────────────────────────────

function SplitsChart({ result, avgResult }: { result: DisplayRow; avgResult: DisplayRow }) {
    const segments = [
        { key: "swim", label: "Swim", color: "#3b82f6", ms: result.swim_ms, avgMs: avgResult.swim_ms },
        { key: "t1",   label: "T1",   color: "#a3a3a3", ms: result.t1_ms,   avgMs: avgResult.t1_ms   },
        { key: "bike", label: "Bike", color: "#f97316", ms: result.bike_ms, avgMs: avgResult.bike_ms },
        { key: "t2",   label: "T2",   color: "#a3a3a3", ms: result.t2_ms,   avgMs: avgResult.t2_ms   },
        { key: "run",  label: "Run",  color: "#22c55e", ms: result.run_ms,  avgMs: avgResult.run_ms  },
    ];

    const total    = segments.reduce((s, seg) => s + (seg.ms    ?? 0), 0) || result.chip_ms;
    const avgTotal = segments.reduce((s, seg) => s + (seg.avgMs ?? 0), 0) || avgResult.chip_ms;
    const isSC     = isSantaClara(result.team);

    const Bar = ({ segs, totalMs, dim }: { segs: typeof segments; totalMs: number; dim?: boolean }) => (
        <div className={`flex h-9 w-full overflow-hidden rounded-lg ${dim ? "opacity-50" : ""}`}>
            {segs.map((seg) => {
                const msVal = dim ? seg.avgMs : seg.ms;
                const pct   = ((msVal ?? 0) / totalMs) * 100;
                if (pct < 0.3) return null;
                return (
                    <div key={seg.key} style={{ width: `${pct}%`, backgroundColor: seg.color }}
                        className="flex items-center justify-center overflow-hidden"
                        title={`${seg.label}: ${msVal ? formatTime(msVal) : "—"}`}>
                        {pct > 7 && <span className="select-none font-medium text-white" style={{ fontSize: 11 }}>{seg.label}</span>}
                    </div>
                );
            })}
        </div>
    );

    const Legend = ({ segs, dim }: { segs: typeof segments; dim?: boolean }) => (
        <div className="mt-1.5 flex flex-wrap gap-3">
            {segs.map((seg) => {
                const msVal = dim ? seg.avgMs : seg.ms;
                return (
                    <span key={seg.key} className="text-xs">
                        <span style={{ color: seg.color }} className="font-medium">{seg.label}</span>
                        <span className="text-zinc-400"> {msVal ? formatTime(msVal) : "—"}</span>
                    </span>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-200">{result.name}</span>
                <span className="text-xs text-zinc-600">#{result.bib}</span>
                {isSC && (
                    <span className="rounded-full border border-maroon-500/40 bg-maroon-500/20 px-2 py-0.5 text-xs text-maroon-300">
                        Santa Clara
                    </span>
                )}
                {result.team && !isSC && (
                    <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400">{result.team}</span>
                )}
                <span className="ml-auto font-mono text-sm text-purple-400">{formatTime(result.chip_ms)}</span>
            </div>

            <div>
                <p className="mb-1.5 text-xs text-zinc-500">Athlete splits</p>
                <Bar segs={segments} totalMs={total} />
                <Legend segs={segments} />
            </div>

            <div>
                <p className="mb-1.5 text-xs text-zinc-500">Field average</p>
                <Bar segs={segments} totalMs={avgTotal} dim />
                <Legend segs={segments} dim />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                <p className="mb-2 text-xs font-medium text-zinc-500">vs. field average</p>
                <div className="flex flex-wrap gap-4">
                    {segments.filter((s) => s.ms && s.avgMs).map((seg) => {
                        const delta = (seg.ms ?? 0) - (seg.avgMs ?? 0);
                        return (
                            <span key={seg.key} className="text-xs">
                                <span style={{ color: seg.color }} className="font-medium">{seg.label}</span>
                                <span className={delta < 0 ? "text-green-400" : "text-red-400"}>
                                    {" "}{delta < 0 ? "-" : "+"}{formatTime(Math.abs(delta))}
                                </span>
                            </span>
                        );
                    })}
                    <span className="ml-auto text-xs">
                        <span className="text-zinc-500">Total </span>
                        {(() => {
                            const d = result.chip_ms - avgResult.chip_ms;
                            return <span className={d < 0 ? "text-green-400" : "text-red-400"}>{d < 0 ? "-" : "+"}{formatTime(Math.abs(d))}</span>;
                        })()}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
    const [allResults, setAllResults] = useState<DisplayRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedResult, setSelectedResult] = useState<DisplayRow | null>(null);
    const [scOnly, setScOnly] = useState(false);
    const [genderFilter, setGenderFilter] = useState("All");
    const [ageGroupFilter, setAgeGroupFilter] = useState("All");
    const [teamFilter, setTeamFilter] = useState("All");
    const [sortKey, setSortKey] = useState<keyof DisplayRow>("chip_ms");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);

    const fetchResults = useCallback(async () => {
        if (!supabase) {
            setError("Supabase not configured — check .env.local");
            setLoading(false);
            return;
        }
        supabase
            .from("results")
            .select(`
                result_id, bib, age_at_race,
                swim, t1, bike, t2, run, chip_elapsed, overall_rank,
                athletes ( id, name, team, city, gender ),
                races    ( id, name, date, type, location )
            `)
            .then(({ data, error: e }) => {
                if (e) { setError(e.message); setLoading(false); return; }
                const rows = (data as unknown as RawResult[])
                    .map(toDisplayRow)
                    .filter((r): r is DisplayRow => r !== null)
                    .sort((a, b) => a.chip_ms - b.chip_ms);
                setAllResults(rows);
                setLoading(false);
            });
    }, []);

    useEffect(() => { fetchResults(); }, [fetchResults]);

    // Derived filter options from data
    const uniqueTeams = useMemo(() => {
        const teams = [...new Set(allResults.map((r) => r.team).filter(Boolean) as string[])].sort();
        return ["All", ...teams];
    }, [allResults]);

    const uniqueAgeGroups = useMemo(() => {
        const ags = [...new Set(allResults.map((r) => r.age_group).filter(Boolean) as string[])].sort();
        return ["All", ...ags];
    }, [allResults]);

    // Filter + sort (client-side)
    const filteredSorted = useMemo(() => {
        const rows = allResults.filter((r) => {
            if (scOnly && !isSantaClara(r.team)) return false;
            if (genderFilter !== "All" && r.gender !== genderFilter) return false;
            if (ageGroupFilter !== "All" && r.age_group !== ageGroupFilter) return false;
            if (teamFilter !== "All" && r.team !== teamFilter) return false;
            return true;
        });
        return [...rows].sort((a, b) => {
            const av = a[sortKey], bv = b[sortKey];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [allResults, scOnly, genderFilter, ageGroupFilter, teamFilter, sortKey, sortDir]);

    useEffect(() => { setPage(0); }, [scOnly, genderFilter, ageGroupFilter, teamFilter, sortKey, sortDir]);

    const totalPages = Math.ceil(filteredSorted.length / pageSize);
    const displayedRows = useMemo(
        () => filteredSorted.slice(page * pageSize, (page + 1) * pageSize).map((r, i) => ({ result: r, rank: page * pageSize + i + 1 })),
        [filteredSorted, page, pageSize],
    );

    // Summary stats over full dataset
    const stats = useMemo(() => {
        if (!allResults.length) return null;
        const scAthletes = allResults.filter((r) => isSantaClara(r.team));
        const times      = allResults.map((r) => r.chip_ms);
        const avgMs      = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        return { total: allResults.length, scCount: scAthletes.length, fastest: Math.min(...times), avg: avgMs };
    }, [allResults]);

    // Field average for splits comparison
    const avgResult = useMemo((): DisplayRow | null => {
        const valid = allResults.filter((r) => r.swim_ms && r.bike_ms && r.run_ms);
        if (!valid.length) return null;
        const avg = (key: keyof DisplayRow) =>
            Math.round(valid.reduce((s, r) => s + ((r[key] as number) || 0), 0) / valid.length);
        return {
            ...valid[0],
            result_id: -1,
            name:      "Field Average",
            team:      null,
            chip_ms:   avg("chip_ms"),
            swim_ms:   avg("swim_ms"),
            t1_ms:     avg("t1_ms"),
            bike_ms:   avg("bike_ms"),
            t2_ms:     avg("t2_ms"),
            run_ms:    avg("run_ms"),
        };
    }, [allResults]);

    function handleSort(key: keyof DisplayRow) {
        if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
    }

    function SortIcon({ col }: { col: keyof DisplayRow }) {
        if (col !== sortKey) return <span className="text-zinc-700 text-xs">↕</span>;
        return <span className="text-purple-400 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
    }

    function Th({ col, children }: { col: keyof DisplayRow; children: React.ReactNode }) {
        return (
            <th onClick={() => handleSort(col)}
                className="cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-purple-400">
                <div className="flex items-center gap-1">{children} <SortIcon col={col} /></div>
            </th>
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-950">
                <div className="flex items-center gap-3 text-zinc-400">
                    <svg className="h-5 w-5 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading results…
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
            <div className="mx-auto max-w-screen-2xl space-y-6">

                {/* ── Header ── */}
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-maroon-600 to-purple-700 shadow-lg">
                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="bg-gradient-to-r from-maroon-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent">
                            Treeathlon 2026
                        </h1>
                        <p className="text-sm text-zinc-500">Sprint Triathlon · 0.4 km swim / 20 km bike / 5 km run</p>
                    </div>
                </div>

                {/* ── Stats Bar ── */}
                {stats && (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <StatCard label="Total Finishers" value={stats.total.toString()} />
                        <StatCard label="Santa Clara Athletes" value={stats.scCount.toString()}
                            sub={`${Math.round((stats.scCount / stats.total) * 100)}% of field`} accent />
                        <StatCard label="Fastest Time" value={formatTime(stats.fastest)} />
                        <StatCard label="Average Time" value={formatTime(stats.avg)} />
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-800 bg-red-950/30 px-5 py-4 text-sm text-red-400">
                        Error: {error}
                    </div>
                )}

                {/* ── Filters ── */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={() => setScOnly((v) => !v)}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                scOnly ? "bg-maroon-600 text-white shadow-md" : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-maroon-500 hover:text-maroon-300"
                            }`}>
                            <span className="h-2 w-2 rounded-full bg-current" />
                            Santa Clara Only
                        </button>

                        <div className="flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800 p-1">
                            {(["All", "M", "F"] as const).map((g) => (
                                <button key={g} onClick={() => setGenderFilter(g)}
                                    className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${
                                        genderFilter === g ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                                    }`}>
                                    {g}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-zinc-500">Age</label>
                            <select value={ageGroupFilter} onChange={(e) => setAgeGroupFilter(e.target.value)}
                                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none">
                                {uniqueAgeGroups.map((ag) => <option key={ag} value={ag} className="bg-zinc-800">{ag}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-zinc-500">Team</label>
                            <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}
                                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none">
                                {uniqueTeams.map((t) => <option key={t} value={t} className="bg-zinc-800">{t}</option>)}
                            </select>
                        </div>

                        <span className="ml-auto text-sm text-zinc-500">
                            <span className="font-semibold text-zinc-300">{filteredSorted.length}</span> result{filteredSorted.length !== 1 ? "s" : ""}
                        </span>

                        {(scOnly || genderFilter !== "All" || ageGroupFilter !== "All" || teamFilter !== "All") && (
                            <button onClick={() => { setScOnly(false); setGenderFilter("All"); setAgeGroupFilter("All"); setTeamFilter("All"); }}
                                className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-300">
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Table controls ── */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        Show
                        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-300 focus:outline-none">
                            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span>· {filteredSorted.length > 0 ? page * pageSize + 1 : 0}–{Math.min((page + 1) * pageSize, filteredSorted.length)} of {filteredSorted.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:border-purple-500 hover:text-purple-400 disabled:cursor-not-allowed disabled:opacity-40">←</button>
                        <span className="rounded bg-purple-500/20 px-3 py-1 text-sm font-semibold text-purple-400">{page + 1} / {totalPages || 1}</span>
                        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:border-purple-500 hover:text-purple-400 disabled:cursor-not-allowed disabled:opacity-40">→</button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-800/60">
                                    <th className="w-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">#</th>
                                    <Th col="bib">Bib</Th>
                                    <Th col="name">Athlete</Th>
                                    <Th col="team">Team</Th>
                                    <Th col="gender">Sex</Th>
                                    <Th col="age_group">Age</Th>
                                    <Th col="chip_ms">Total</Th>
                                    <Th col="swim_ms">Swim</Th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Pace</th>
                                    <Th col="t1_ms">T1</Th>
                                    <Th col="bike_ms">Bike</Th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Speed</th>
                                    <Th col="t2_ms">T2</Th>
                                    <Th col="run_ms">Run</Th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Pace</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {displayedRows.length === 0 ? (
                                    <tr><td colSpan={15} className="px-6 py-16 text-center text-zinc-500">No results match the current filters</td></tr>
                                ) : (
                                    displayedRows.map(({ result: r, rank }) => {
                                        const isSC      = isSantaClara(r.team);
                                        const isSelected = selectedResult?.result_id === r.result_id;
                                        return (
                                            <tr key={r.result_id}
                                                onClick={() => setSelectedResult(isSelected ? null : r)}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected ? "border-l-2 border-l-purple-500 bg-purple-900/25"
                                                    : isSC     ? "border-l-2 border-l-maroon-600 bg-maroon-950/25 hover:bg-maroon-950/40"
                                                               : "border-l-2 border-l-transparent hover:bg-zinc-800/30"
                                                }`}>
                                                <td className="px-3 py-2.5 text-xs text-zinc-600">{rank}</td>
                                                <td className="px-3 py-2.5 font-mono text-zinc-500">{r.bib}</td>
                                                <td className="px-3 py-2.5 font-medium text-zinc-200 whitespace-nowrap">{r.name}</td>
                                                <td className="px-3 py-2.5">
                                                    {r.team ? (
                                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                            isSC ? "border border-maroon-500/40 bg-maroon-500/20 text-maroon-300"
                                                                 : "bg-zinc-700/60 text-zinc-400"
                                                        }`}>{r.team}</span>
                                                    ) : <span className="text-zinc-700">—</span>}
                                                </td>
                                                <td className="px-3 py-2.5 text-zinc-400">{r.gender ?? <span className="text-zinc-700">—</span>}</td>
                                                <td className="px-3 py-2.5 text-zinc-400">{r.age_group ?? <span className="text-zinc-700">—</span>}</td>
                                                <td className="px-3 py-2.5 font-mono font-semibold text-purple-400">{formatTime(r.chip_ms)}</td>
                                                <td className="px-3 py-2.5 font-mono text-zinc-300">{r.swim_ms ? formatTime(r.swim_ms) : <span className="text-zinc-700">—</span>}</td>
                                                <td className="px-3 py-2.5 text-xs text-zinc-500">{swimPaceStr(r.swim_ms)}</td>
                                                <td className="px-3 py-2.5 font-mono text-zinc-500">{r.t1_ms ? formatTime(r.t1_ms) : <span className="text-zinc-700">—</span>}</td>
                                                <td className="px-3 py-2.5 font-mono text-zinc-300">{r.bike_ms ? formatTime(r.bike_ms) : <span className="text-zinc-700">—</span>}</td>
                                                <td className="px-3 py-2.5 text-xs text-zinc-500">{bikePaceStr(r.bike_ms)}</td>
                                                <td className="px-3 py-2.5 font-mono text-zinc-500">{r.t2_ms ? formatTime(r.t2_ms) : <span className="text-zinc-700">—</span>}</td>
                                                <td className="px-3 py-2.5 font-mono text-zinc-300">{r.run_ms ? formatTime(r.run_ms) : <span className="text-zinc-700">—</span>}</td>
                                                <td className="px-3 py-2.5 text-xs text-zinc-500">{runPaceStr(r.run_ms)}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Charts ── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                        {allResults.length > 0 ? (
                            <Histogram all={allResults} filtered={filteredSorted} />
                        ) : (
                            <p className="text-center text-sm text-zinc-600">No data</p>
                        )}
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                        <h3 className="mb-4 text-sm font-semibold text-zinc-300">
                            Splits Breakdown
                            {!selectedResult && <span className="ml-2 text-xs font-normal text-zinc-500">— click a row to inspect</span>}
                        </h3>
                        {selectedResult && avgResult ? (
                            <SplitsChart result={selectedResult} avgResult={avgResult} />
                        ) : (
                            <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-zinc-600">
                                <svg className="h-10 w-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <p className="text-sm">Select an athlete from the table above</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
