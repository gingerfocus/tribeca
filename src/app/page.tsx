"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import {
    RawResult, DisplayRow,
    isSantaClara, toDisplayRow, formatTime, median,
} from "@/lib/triathlon";
import { ScuSummary } from "@/components/ScuSummary";
import { SplitsChart } from "@/components/SplitsChart";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
    label: string; value: string; sub?: string; accent?: boolean;
}) {
    return (
        <div className={`rounded-xl border px-5 py-4 shadow-sm ${
            accent ? "border-cardinal-200 bg-cardinal-50" : "border-gray-200 bg-white"
        }`}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${accent ? "text-cardinal-800" : "text-gray-900"}`}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
    const [allResults, setAllResults] = useState<DisplayRow[]>([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState<string | null>(null);
    const [selectedRace, setSelectedRace] = useState<string>("All");
    const [athleteQuery, setAthleteQuery] = useState("");
    const [selectedAthlete, setSelectedAthlete] = useState<DisplayRow | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const fetchResults = useCallback(async () => {
        if (!supabase) {
            setError("Supabase not configured — check .env.local");
            setLoading(false);
            return;
        }
        supabase
            .from("results")
            .select(`
                result_id, athlete_bib, athlete_age, athlete_division,
                time_swim, time_t1, time_bike, time_t2, time_run, time_chip,
                athletes ( id, name, team, city, gender ),
                races ( id, race_name, race_date, race_type, race_location, meters_swim, meters_bike, meters_run )
            `)
            .then(({ data, error: e }) => {
                if (e) { setError(e.message); setLoading(false); return; }
                // TODO: fix this convertion
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
        setSelectedAthlete(null);
        setAthleteQuery("");
    }, [selectedRace]);

    const stats = useMemo(() => {
        if (!raceResults.length) return null;
        const scAthletes = raceResults.filter((r) => isSantaClara(r.team));
        const times      = raceResults.map((r) => r.chip_ms);
        return {
            total:    raceResults.length,
            scCount:  scAthletes.length,
            fastest:  Math.min(...times),
            medianMs: median(times),
        };
    }, [raceResults]);

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

    // Athlete search – show SCU athletes prominently, then others
    const athleteSuggestions = useMemo(() => {
        const q = athleteQuery.trim().toLowerCase();
        const pool = raceResults.filter((r) =>
            !q || r.name.toLowerCase().includes(q)
        );
        // Deduplicate by result_id (already unique), sort SCU first then by time
        return pool
            .slice()
            .sort((a, b) => {
                const aSC = isSantaClara(a.team) ? 0 : 1;
                const bSC = isSantaClara(b.team) ? 0 : 1;
                if (aSC !== bSC) return aSC - bSC;
                return a.chip_ms - b.chip_ms;
            })
            .slice(0, 20);
    }, [raceResults, athleteQuery]);

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
            <div className="mx-auto max-w-screen-xl space-y-6">

                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-cardinal-800 shadow-md">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-cardinal-900">Treeathlon 2026</h1>
                            <p className="text-sm text-gray-400">Sprint Triathlon · 0.4 km swim / 20 km bike / 5 km run</p>
                        </div>
                    </div>
                    <Link
                        href="/races"
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-cardinal-300 hover:text-cardinal-700">
                        Race Results
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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

                {/* ── Stats Bar ── */}
                {stats && (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <StatCard label="Total Finishers"      value={stats.total.toString()} />
                        <StatCard label="Santa Clara Athletes" value={stats.scCount.toString()}
                            sub={`${Math.round((stats.scCount / stats.total) * 100)}% of field`} accent />
                        <StatCard label="Fastest Time"  value={formatTime(stats.fastest)} />
                        <StatCard label="Median Time"   value={formatTime(stats.medianMs)} />
                    </div>
                )}

                {/* ── SCU Summary ── */}
                {raceResults.length > 0 && <ScuSummary raceResults={raceResults} />}

                {/* ── Individual Athlete Performance ── */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-sm font-semibold text-gray-700">Individual Performance</h2>

                    {/* Athlete search */}
                    <div className="relative mb-5 max-w-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search athlete…"
                            value={athleteQuery}
                            onChange={(e) => { setAthleteQuery(e.target.value); setDropdownOpen(true); }}
                            onFocus={() => setDropdownOpen(true)}
                            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-cardinal-400 focus:outline-none"
                        />
                        {dropdownOpen && athleteSuggestions.length > 0 && (
                            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                {athleteSuggestions.map((r) => {
                                    const isSC = isSantaClara(r.team);
                                    return (
                                        <button key={r.result_id}
                                            onClick={() => {
                                                setSelectedAthlete(r);
                                                setAthleteQuery(r.name);
                                                setDropdownOpen(false);
                                            }}
                                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                                                selectedAthlete?.result_id === r.result_id ? "bg-cardinal-50" : ""
                                            }`}>
                                            {isSC && (
                                                <span className="flex-shrink-0 rounded-full border border-cardinal-200 bg-cardinal-50 px-1.5 py-0.5 text-xs font-medium text-cardinal-700">SCU</span>
                                            )}
                                            <span className="flex-1 font-medium text-gray-800">{r.name}</span>
                                            <span className="text-xs text-gray-400">{r.gender} · {r.age_group ?? "—"}</span>
                                            <span className="font-mono text-xs font-semibold text-cardinal-700">{formatTime(r.chip_ms)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Splits chart */}
                    {selectedAthlete && avgResult ? (
                        <SplitsChart result={selectedAthlete} avgResult={avgResult} />
                    ) : (
                        <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-gray-300">
                            <svg className="h-10 w-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="text-sm text-gray-400">Search for an athlete above to view their splits</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
