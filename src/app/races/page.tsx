"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import {
    RawResult, DisplayRow,
    isSantaClara, toDisplayRow, median,
} from "@/lib/triathlon";
import { SplitsChart } from "@/components/SplitsChart";
import { ResultsTable } from "@/components/ResultsTable/ResultsTable";
import { FilterBar } from "@/components/ResultsTable/FilterBar";

interface RaceInfo {
    name: string;
    type: string;
    swim: number;
    bike: number;
    run: number;
}

const DEFAULT_DISTANCES = { swim: 0.4, bike: 20, run: 5 };

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

function formatTime(ms: number): string {
    const s   = Math.floor(ms / 1000);
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}` : `${m}:${sec.toString().padStart(2, "0")}`;
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
    const [divisionFilter, setDivisionFilter] = useState("All");
    const [ageGroupFilter, setAgeGroupFilter] = useState("All");
    const [teamFilter, setTeamFilter]         = useState("All");

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

    const selectedRaceInfo = useMemo((): RaceInfo => {
        if (selectedRace === "All") {
            const firstWithDist = allResults.find(r => r.race_swim_km);
            if (firstWithDist) {
                return {
                    name: "All Races",
                    type: firstWithDist.race_type || "Sprint",
                    swim: firstWithDist.race_swim_km ?? DEFAULT_DISTANCES.swim,
                    bike: firstWithDist.race_bike_km ?? DEFAULT_DISTANCES.bike,
                    run: firstWithDist.race_run_km ?? DEFAULT_DISTANCES.run,
                };
            }
            return { name: "All Races", type: "Sprint", ...DEFAULT_DISTANCES };
        }
        const raceData = allResults.find(r => r.race_name === selectedRace);
        return {
            name: selectedRace,
            type: raceData?.race_type || "Sprint",
            swim: raceData?.race_swim_km ?? DEFAULT_DISTANCES.swim,
            bike: raceData?.race_bike_km ?? DEFAULT_DISTANCES.bike,
            run: raceData?.race_run_km ?? DEFAULT_DISTANCES.run,
        };
    }, [allResults, selectedRace]);

    useEffect(() => {
        setScOnly(false); setGenderFilter("All"); setDivisionFilter("All");
        setAgeGroupFilter("All"); setTeamFilter("All"); setSelectedResult(null);
    }, [selectedRace]);

    const filteredResults = useMemo(() => {
        return raceResults.filter((r) => {
            if (scOnly && !isSantaClara(r.team)) return false;
            if (genderFilter !== "All" && r.gender !== genderFilter) return false;
            if (divisionFilter !== "All" && r.division !== divisionFilter) return false;
            if (ageGroupFilter !== "All" && r.age_group !== ageGroupFilter) return false;
            if (teamFilter !== "All" && r.team !== teamFilter) return false;
            return true;
        });
    }, [raceResults, scOnly, genderFilter, divisionFilter, ageGroupFilter, teamFilter]);

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

    const handleClearFilters = useCallback(() => {
        setScOnly(false);
        setGenderFilter("All");
        setDivisionFilter("All");
        setAgeGroupFilter("All");
        setTeamFilter("All");
    }, []);

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
                            <p className="text-sm text-gray-400">
                                {selectedRaceInfo.type} Triathlon · {selectedRaceInfo.swim} km swim / {selectedRaceInfo.bike} km bike / {selectedRaceInfo.run} km run
                            </p>
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
                    <RaceSelector
                        uniqueRaces={uniqueRaces}
                        selectedRace={selectedRace}
                        onSelectRace={setSelectedRace}
                        allResultsCount={allResults.length}
                    />
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                        Error: {error}
                    </div>
                )}

                {/* ── Filters ── */}
                <FilterBar
                    raceResults={raceResults}
                    scOnly={scOnly}
                    setScOnly={setScOnly}
                    genderFilter={genderFilter}
                    setGenderFilter={setGenderFilter}
                    divisionFilter={divisionFilter}
                    setDivisionFilter={setDivisionFilter}
                    ageGroupFilter={ageGroupFilter}
                    setAgeGroupFilter={setAgeGroupFilter}
                    teamFilter={teamFilter}
                    setTeamFilter={setTeamFilter}
                    filteredCount={filteredResults.length}
                    onClearFilters={handleClearFilters}
                />

                {/* ── Table ── */}
                <ResultsTable
                    data={filteredResults}
                    onRowClick={(row) => setSelectedResult(selectedResult?.result_id === row.result_id ? null : row)}
                    selectedResult={selectedResult}
                />

                {/* ── Charts ── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        {raceResults.length > 0 ? (
                            <Histogram all={raceResults} filtered={filteredResults} />
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

// ─── Race Selector ────────────────────────────────────────────────────────────

function RaceSelector({
    uniqueRaces,
    selectedRace,
    onSelectRace,
    allResultsCount,
}: {
    uniqueRaces: { name: string; date: string | null }[];
    selectedRace: string;
    onSelectRace: (race: string) => void;
    allResultsCount: number;
}) {
    return (
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
                        onClick={() => onSelectRace("All")}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            selectedRace === "All"
                                ? "bg-cardinal-800 text-white shadow-sm"
                                : "border border-gray-200 bg-white text-gray-500 hover:border-cardinal-200 hover:text-cardinal-700"
                        }`}>
                        All Races
                        <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${selectedRace === "All" ? "bg-cardinal-700 text-cardinal-100" : "bg-gray-100 text-gray-400"}`}>
                            {allResultsCount}
                        </span>
                    </button>
                )}
                {uniqueRaces.map((race) => {
                    const count    = allResultsCount; // Simplified - would need to compute per race
                    const isActive = selectedRace === race.name;
                    return (
                        <button key={race.name} onClick={() => onSelectRace(race.name)}
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
                        </button>
                    );
                })}
            </div>
        </div>
    );
}