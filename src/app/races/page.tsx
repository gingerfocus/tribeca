"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import {
    RawResult, DisplayRow, PAGE_SIZES,
    isSantaClara, toDisplayRow, formatTime,
    swimPaceStr, bikePaceStr, runPaceStr, median,
} from "@/lib/triathlon";
import { SplitsChart } from "@/components/SplitsChart";

// ─── Histogram ────────────────────────────────────────────────────────────────

function Histogram({ all, filtered }: { all: DisplayRow[]; filtered: DisplayRow[] }) {
    const BIN_MS  = 10 * 60 * 1000;
    const times   = all.map((r) => r.chip_ms);
    const minT    = Math.floor(Math.min(...times) / BIN_MS) * BIN_MS;
    const maxT    = Math.ceil(Math.max(...times) / BIN_MS) * BIN_MS;
    const numBins = Math.max((maxT - minT) / BIN_MS, 1);

    const bins = Array.from({ length: numBins }, (_, i) => {
        const lo         = minT + i * BIN_MS;
        const hi         = lo + BIN_MS;
        const inAll      = all.filter((r) => r.chip_ms >= lo && r.chip_ms < hi).length;
        const inFiltered = filtered.filter((r) => r.chip_ms >= lo && r.chip_ms < hi);
        const sc         = inFiltered.filter((r) => isSantaClara(r.team)).length;
        const others     = inFiltered.length - sc;
        return { lo, all: inAll, others, sc };
    });

    const maxCount = Math.max(...bins.map((b) => b.all), 1);
    const W = 800, H = 150, PAD_B = 28;
    const barW = W / numBins - 2;

    return (
        <div>
            <div className="mb-3 flex items-start justify-between gap-4">
                <h3 className="text-sm font-semibold text-gray-700">
                    Finish Time Distribution
                    <span className="ml-2 text-xs font-normal text-gray-400">10-min bins</span>
                </h3>
                <div className="flex flex-shrink-0 items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-blue-400" />Others</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-cardinal-700" />Santa Clara</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-gray-200" />Filtered out</span>
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
                            {bin.all > 0 && <rect x={x} y={H - allH}       width={barW} height={allH}  fill="#e5e7eb" rx={2} />}
                            {othH    > 0 && <rect x={x} y={H - othH - scH} width={barW} height={othH}  fill="#60a5fa" opacity={0.8} rx={2} />}
                            {scH     > 0 && <rect x={x} y={H - scH}        width={barW} height={scH}   fill="#862633" rx={2} />}
                            {i % 2 === 0 && (
                                <text x={x + barW / 2} y={H + PAD_B - 4} textAnchor="middle" fill="#9ca3af" fontSize={9}>
                                    {formatTime(bin.lo)}
                                </text>
                            )}
                        </g>
                    );
                })}
                <line x1={0} y1={H} x2={W} y2={H} stroke="#e5e7eb" strokeWidth={1} />
            </svg>
        </div>
    );
}

// ─── Race Results Page ────────────────────────────────────────────────────────

export default function RacesPage() {
    const [allResults, setAllResults]         = useState<DisplayRow[]>([]);
    const [loading, setLoading]               = useState(true);
    const [error, setError]                   = useState<string | null>(null);
    const [selectedResult, setSelectedResult] = useState<DisplayRow | null>(null);
    const [selectedRace, setSelectedRace]     = useState<string>("All");
    const [scOnly, setScOnly]                 = useState(false);
    const [genderFilter, setGenderFilter]     = useState("All");
    const [ageGroupFilter, setAgeGroupFilter] = useState("All");
    const [teamFilter, setTeamFilter]         = useState("All");
    const [sortKey, setSortKey]               = useState<keyof DisplayRow>("chip_ms");
    const [sortDir, setSortDir]               = useState<"asc" | "desc">("asc");
    const [page, setPage]                     = useState(0);
    const [pageSize, setPageSize]             = useState(25);

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

    const uniqueRaces = useMemo(() => {
        const seen = new Map<string, { name: string; date: string | null }>();
        for (const r of allResults) {
            if (!seen.has(r.race_name)) seen.set(r.race_name, { name: r.race_name, date: r.race_date });
        }
        return [...seen.values()].sort((a, b) => {
            if (a.date && b.date) return a.date.localeCompare(b.date);
            return a.name.localeCompare(b.name);
        });
    }, [allResults]);

    const raceResults = useMemo(() =>
        selectedRace === "All" ? allResults : allResults.filter((r) => r.race_name === selectedRace),
        [allResults, selectedRace],
    );

    useEffect(() => {
        setScOnly(false); setGenderFilter("All"); setAgeGroupFilter("All");
        setTeamFilter("All"); setSelectedResult(null); setPage(0);
    }, [selectedRace]);

    const uniqueTeams = useMemo(() => {
        const teams = [...new Set(raceResults.map((r) => r.team).filter(Boolean) as string[])].sort();
        return ["All", ...teams];
    }, [raceResults]);

    const uniqueAgeGroups = useMemo(() => {
        const ags = [...new Set(raceResults.map((r) => r.age_group).filter(Boolean) as string[])].sort();
        return ["All", ...ags];
    }, [raceResults]);

    const filteredSorted = useMemo(() => {
        const rows = raceResults.filter((r) => {
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
    }, [raceResults, scOnly, genderFilter, ageGroupFilter, teamFilter, sortKey, sortDir]);

    useEffect(() => { setPage(0); }, [scOnly, genderFilter, ageGroupFilter, teamFilter, sortKey, sortDir]);

    const totalPages    = Math.ceil(filteredSorted.length / pageSize);
    const displayedRows = useMemo(
        () => filteredSorted.slice(page * pageSize, (page + 1) * pageSize).map((r, i) => ({ result: r, rank: page * pageSize + i + 1 })),
        [filteredSorted, page, pageSize],
    );

    const avgResult = useMemo((): DisplayRow | null => {
        const valid = raceResults.filter((r) => r.swim_ms && r.bike_ms && r.run_ms);
        if (!valid.length) return null;
        const avg = (key: keyof DisplayRow) =>
            median(valid.map((r) => (r[key] as number) || 0).filter(Boolean));
        return {
            ...valid[0], result_id: -1, name: "Field Median", team: null,
            chip_ms: avg("chip_ms"), swim_ms: avg("swim_ms"), t1_ms: avg("t1_ms"),
            bike_ms: avg("bike_ms"), t2_ms: avg("t2_ms"),     run_ms: avg("run_ms"),
        };
    }, [raceResults]);

    function handleSort(key: keyof DisplayRow) {
        if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
    }

    function SortIcon({ col }: { col: keyof DisplayRow }) {
        if (col !== sortKey) return <span className="text-xs text-gray-300">↕</span>;
        return <span className="text-xs text-cardinal-600">{sortDir === "asc" ? "↑" : "↓"}</span>;
    }

    function Th({ col, children }: { col: keyof DisplayRow; children: React.ReactNode }) {
        return (
            <th onClick={() => handleSort(col)}
                className="cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-cardinal-700">
                <div className="flex items-center gap-1">{children} <SortIcon col={col} /></div>
            </th>
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex items-center gap-3 text-gray-400">
                    <svg className="h-5 w-5 animate-spin text-cardinal-700" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading results…
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-screen-2xl space-y-6">

                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-cardinal-800 shadow-md">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-cardinal-900">Race Results</h1>
                            <p className="text-sm text-gray-400">Sprint Triathlon · 0.4 km swim / 20 km bike / 5 km run</p>
                        </div>
                    </div>
                    <Link
                        href="/"
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-cardinal-300 hover:text-cardinal-700">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Dashboard
                    </Link>
                </div>

                {/* ── Race Selector ── */}
                {uniqueRaces.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Race</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {uniqueRaces.length > 1 && (
                                <button
                                    onClick={() => setSelectedRace("All")}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                        selectedRace === "All"
                                            ? "bg-cardinal-800 text-white shadow-sm"
                                            : "border border-gray-200 bg-white text-gray-500 hover:border-cardinal-200 hover:text-cardinal-700"
                                    }`}>
                                    All Races
                                    <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${selectedRace === "All" ? "bg-cardinal-700 text-cardinal-100" : "bg-gray-100 text-gray-400"}`}>
                                        {allResults.length}
                                    </span>
                                </button>
                            )}
                            {uniqueRaces.map((race) => {
                                const count    = allResults.filter((r) => r.race_name === race.name).length;
                                const isActive = selectedRace === race.name;
                                return (
                                    <button key={race.name} onClick={() => setSelectedRace(race.name)}
                                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                            isActive
                                                ? "bg-cardinal-800 text-white shadow-sm"
                                                : "border border-gray-200 bg-white text-gray-500 hover:border-cardinal-200 hover:text-cardinal-700"
                                        }`}>
                                        {race.name}
                                        {race.date && (
                                            <span className={`ml-2 text-xs ${isActive ? "text-cardinal-200" : "text-gray-300"}`}>
                                                {new Date(race.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </span>
                                        )}
                                        <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${isActive ? "bg-cardinal-700 text-cardinal-100" : "bg-gray-100 text-gray-400"}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                        Error: {error}
                    </div>
                )}

                {/* ── Filters ── */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={() => setScOnly((v) => !v)}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                scOnly
                                    ? "bg-cardinal-800 text-white shadow-sm"
                                    : "border border-gray-200 bg-white text-gray-500 hover:border-cardinal-200 hover:text-cardinal-700"
                            }`}>
                            <span className="h-2 w-2 rounded-full bg-current" />
                            Santa Clara Only
                        </button>

                        <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-1">
                            {(["All", "M", "F"] as const).map((g) => (
                                <button key={g} onClick={() => setGenderFilter(g)}
                                    className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${
                                        genderFilter === g
                                            ? "bg-cardinal-800 text-white shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}>
                                    {g}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-400">Age</label>
                            <select value={ageGroupFilter} onChange={(e) => setAgeGroupFilter(e.target.value)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-cardinal-400 focus:outline-none">
                                {uniqueAgeGroups.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-400">Team</label>
                            <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-cardinal-400 focus:outline-none">
                                {uniqueTeams.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <span className="ml-auto text-sm text-gray-400">
                            <span className="font-semibold text-gray-700">{filteredSorted.length}</span> result{filteredSorted.length !== 1 ? "s" : ""}
                        </span>

                        {(scOnly || genderFilter !== "All" || ageGroupFilter !== "All" || teamFilter !== "All") && (
                            <button onClick={() => { setScOnly(false); setGenderFilter("All"); setAgeGroupFilter("All"); setTeamFilter("All"); }}
                                className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600">
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Table controls ── */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        Show
                        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                            className="rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-600 focus:outline-none">
                            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span>· {filteredSorted.length > 0 ? page * pageSize + 1 : 0}–{Math.min((page + 1) * pageSize, filteredSorted.length)} of {filteredSorted.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                            className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-500 hover:border-cardinal-300 hover:text-cardinal-700 disabled:cursor-not-allowed disabled:opacity-40">←</button>
                        <span className="rounded border border-cardinal-200 bg-cardinal-50 px-3 py-1 text-sm font-semibold text-cardinal-700">{page + 1} / {totalPages || 1}</span>
                        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                            className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-500 hover:border-cardinal-300 hover:text-cardinal-700 disabled:cursor-not-allowed disabled:opacity-40">→</button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="w-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">#</th>
                                    <Th col="bib">Bib</Th>
                                    <Th col="name">Athlete</Th>
                                    <Th col="team">Team</Th>
                                    <Th col="gender">Sex</Th>
                                    <Th col="age_group">Age</Th>
                                    <Th col="chip_ms">Total</Th>
                                    <Th col="swim_ms">Swim</Th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Pace</th>
                                    <Th col="t1_ms">T1</Th>
                                    <Th col="bike_ms">Bike</Th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Speed</th>
                                    <Th col="t2_ms">T2</Th>
                                    <Th col="run_ms">Run</Th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Pace</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayedRows.length === 0 ? (
                                    <tr><td colSpan={15} className="px-6 py-16 text-center text-gray-400">No results match the current filters</td></tr>
                                ) : (
                                    displayedRows.map(({ result: r, rank }) => {
                                        const isSC       = isSantaClara(r.team);
                                        const isSelected = selectedResult?.result_id === r.result_id;
                                        return (
                                            <tr key={r.result_id}
                                                onClick={() => setSelectedResult(isSelected ? null : r)}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected ? "border-l-2 border-l-cardinal-600 bg-cardinal-50"
                                                    : isSC     ? "border-l-2 border-l-cardinal-600 bg-cardinal-50/40 hover:bg-cardinal-50/70"
                                                               : "border-l-2 border-l-transparent hover:bg-gray-50"
                                                }`}>
                                                <td className="px-3 py-2.5 text-xs text-gray-300">{rank}</td>
                                                <td className="px-3 py-2.5 font-mono text-gray-400">{r.bib}</td>
                                                <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{r.name}</td>
                                                <td className="px-3 py-2.5">
                                                    {r.team ? (
                                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                            isSC ? "border border-cardinal-200 bg-cardinal-50 text-cardinal-700"
                                                                 : "bg-gray-100 text-gray-500"
                                                        }`}>{r.team}</span>
                                                    ) : <span className="text-gray-200">—</span>}
                                                </td>
                                                <td className="px-3 py-2.5 text-gray-500">{r.gender ?? <span className="text-gray-200">—</span>}</td>
                                                <td className="px-3 py-2.5 text-gray-500">{r.age_group ?? <span className="text-gray-200">—</span>}</td>
                                                <td className="px-3 py-2.5 font-mono font-semibold text-cardinal-700">{formatTime(r.chip_ms)}</td>
                                                <td className="px-3 py-2.5 font-mono text-gray-600">{r.swim_ms ? formatTime(r.swim_ms) : <span className="text-gray-200">—</span>}</td>
                                                <td className="px-3 py-2.5 text-xs text-gray-400">{swimPaceStr(r.swim_ms)}</td>
                                                <td className="px-3 py-2.5 font-mono text-gray-400">{r.t1_ms ? formatTime(r.t1_ms) : <span className="text-gray-200">—</span>}</td>
                                                <td className="px-3 py-2.5 font-mono text-gray-600">{r.bike_ms ? formatTime(r.bike_ms) : <span className="text-gray-200">—</span>}</td>
                                                <td className="px-3 py-2.5 text-xs text-gray-400">{bikePaceStr(r.bike_ms)}</td>
                                                <td className="px-3 py-2.5 font-mono text-gray-400">{r.t2_ms ? formatTime(r.t2_ms) : <span className="text-gray-200">—</span>}</td>
                                                <td className="px-3 py-2.5 font-mono text-gray-600">{r.run_ms ? formatTime(r.run_ms) : <span className="text-gray-200">—</span>}</td>
                                                <td className="px-3 py-2.5 text-xs text-gray-400">{runPaceStr(r.run_ms)}</td>
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
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        {raceResults.length > 0 ? (
                            <Histogram all={raceResults} filtered={filteredSorted} />
                        ) : (
                            <p className="text-center text-sm text-gray-300">No data</p>
                        )}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 text-sm font-semibold text-gray-700">
                            Splits Breakdown
                            {!selectedResult && <span className="ml-2 text-xs font-normal text-gray-400">— click a row to inspect</span>}
                        </h3>
                        {selectedResult && avgResult ? (
                            <SplitsChart result={selectedResult} avgResult={avgResult} />
                        ) : (
                            <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-gray-300">
                                <svg className="h-10 w-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <p className="text-sm text-gray-400">Select an athlete from the table above</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
