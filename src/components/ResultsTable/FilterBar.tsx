"use client";

import { DisplayRow, isSantaClara } from "@/lib/triathlon";

interface FilterBarProps {
    raceResults: DisplayRow[];
    scOnly: boolean;
    setScOnly: (v: boolean) => void;
    genderFilter: string;
    setGenderFilter: (v: string) => void;
    divisionFilter: string;
    setDivisionFilter: (v: string) => void;
    ageGroupFilter: string;
    setAgeGroupFilter: (v: string) => void;
    teamFilter: string;
    setTeamFilter: (v: string) => void;
    filteredCount: number;
    onClearFilters: () => void;
}

export function FilterBar({
    raceResults,
    scOnly,
    setScOnly,
    genderFilter,
    setGenderFilter,
    divisionFilter,
    setDivisionFilter,
    ageGroupFilter,
    setAgeGroupFilter,
    teamFilter,
    setTeamFilter,
    filteredCount,
    onClearFilters,
}: FilterBarProps) {
    const teamsSet = new Set(raceResults.map((r) => r.team).filter(Boolean) as string[]);
    const teams = Array.from(teamsSet).sort();
    
    const ageGroupsSet = new Set(raceResults.map((r) => r.age_group).filter(Boolean) as string[]);
    const ageGroups = Array.from(ageGroupsSet).sort();
    
    const divisionsSet = new Set(raceResults.map((r) => r.division).filter(Boolean) as string[]);
    const divisions = Array.from(divisionsSet).sort();

    const hasFilters = scOnly || genderFilter !== "All" || divisionFilter !== "All" || ageGroupFilter !== "All" || teamFilter !== "All";

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => setScOnly(!scOnly)}
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

                <select value={ageGroupFilter} onChange={(e) => setAgeGroupFilter(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-cardinal-400 focus:outline-none">
                    <option value="All">All Ages</option>
                    {ageGroups.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
                </select>

                <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-cardinal-400 focus:outline-none">
                    <option value="All">All Divisions</option>
                    {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>

                <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-cardinal-400 focus:outline-none">
                    <option value="All">All Teams</option>
                    {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>

                <span className="ml-auto text-sm text-gray-400">
                    <span className="font-semibold text-gray-700">{filteredCount}</span> result{filteredCount !== 1 ? "s" : ""}
                </span>

                {hasFilters && (
                    <button onClick={onClearFilters}
                        className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600">
                        Clear filters
                    </button>
                )}
            </div>
        </div>
    );
}