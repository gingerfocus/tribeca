"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface RaceResult {
    id: string;
    person_id: string;
    race_type: string;
    race_name: string;
    distance: string | null;
    time_ms: number;
    event_date: string;
    age_group: string | null;
    gender: string | null;
    swim_distance: string | null;
    bike_distance: string | null;
    run_distance: string | null;
    swim_time_ms: number | null;
    transition1_time_ms: number | null;
    bike_time_ms: number | null;
    transition2_time_ms: number | null;
    run_time_ms: number | null;
    created_at: string;
}

const RACE_TYPES = ["All", "running", "duoathlon", "triathlon"];
const DISTANCES = [
    "All",
    "5km",
    "8km",
    "10km",
    "15km",
    "21.1km",
    "25km",
    "25.75km",
    "38km",
    "42.2km",
    "51km",
    "51.5km",
    "113km",
    "226.2km",
];
const RACES = [
    "All",
    "Boston Marathon",
    "NYC Half Marathon",
    "Chicago Marathon",
    "London Marathon",
    "Berlin Marathon",
    "Boston 5K",
    "World Championships",
    "European Championships",
    "National Qualifier",
    "Ironman World Championship",
    "Olympic Distance",
    "Half Ironman",
    "Sprint Triathlon",
];
const AGE_GROUPS = [
    "All",
    "M18-19",
    "M20-24",
    "M25-29",
    "M30-34",
    "M35-39",
    "M40-44",
    "M45-49",
    "M50-54",
    "M55-59",
    "M60+",
    "F18-19",
    "F20-24",
    "F25-29",
    "F30-34",
    "F35-39",
    "F40-44",
    "F45-49",
    "F50-54",
    "F55-59",
    "F60+",
];
const GENDERS = ["All", "M", "F"];
const LIMITS = [10, 25, 50, 100];

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
}

function Select({
    value,
    onChange,
    options,
    className = "",
}: {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    className?: string;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full appearance-none rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 pr-10 text-zinc-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 ${className}`}
            >
                {options.map((opt) => (
                    <option key={opt} value={opt} className="bg-zinc-800">
                        {opt}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                <svg
                    className="h-4 w-4 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </div>
        </div>
    );
}

function Input({
    value,
    onChange,
    placeholder,
    type = "text",
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        />
    );
}

function RaceTypeBadge({ type }: { type: string }) {
    const colors: Record<string, string> = {
        running: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        duoathlon: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        triathlon: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    };

    return (
        <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[type] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"}`}
        >
            {type}
        </span>
    );
}

function NullValue({ value }: { value: string | number | null | undefined }) {
    if (value === null || value === undefined) {
        return <span className="text-zinc-600">-</span>;
    }
    return <span>{value}</span>;
}

function TimeValue({ ms }: { ms: number | null | undefined }) {
    if (ms === null || ms === undefined) {
        return <span className="text-zinc-600">-</span>;
    }
    return <span className="font-mono text-purple-400">{formatTime(ms)}</span>;
}

export default function Home() {
    const [results, setResults] = useState<RaceResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        personId: "",
        raceType: "All",
        raceName: "All",
        distance: "All",
        ageGroup: "All",
        gender: "All",
        minTime: "",
        maxTime: "",
    });

    const [sortConfig, setSortConfig] = useState<{
        column: keyof RaceResult;
        direction: "asc" | "desc";
    }>({ column: "time_ms", direction: "asc" });

    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const fetchResults = useCallback(async () => {
        if (!supabase) {
            setError(
                "Supabase client not initialized. Please configure .env.local",
            );
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            let query = supabase
                .from("race_results")
                .select("*", { count: "exact" });

            if (filters.personId) {
                query = query.ilike("person_id", `%${filters.personId}%`);
            }

            if (filters.raceType !== "All") {
                query = query.eq("race_type", filters.raceType);
            }

            if (filters.raceName !== "All") {
                query = query.eq("race_name", filters.raceName);
            }

            if (filters.distance !== "All") {
                query = query.eq("distance", filters.distance);
            }

            if (filters.ageGroup !== "All") {
                query = query.eq("age_group", filters.ageGroup);
            }

            if (filters.gender !== "All") {
                query = query.eq("gender", filters.gender);
            }

            if (filters.minTime) {
                query = query.gte("time_ms", parseInt(filters.minTime));
            }

            if (filters.maxTime) {
                query = query.lte("time_ms", parseInt(filters.maxTime));
            }

            query = query.order(sortConfig.column, {
                ascending: sortConfig.direction === "asc",
            });
            query = query.range(offset, offset + limit - 1);

            const { data, count, error: supabaseError } = await query;

            if (supabaseError) throw supabaseError;

            setResults(data || []);
            setTotalCount(count || 0);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to fetch results",
            );
        } finally {
            setLoading(false);
        }
    }, [filters, sortConfig, limit, offset]);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    function handleFilterChange(field: string, value: string) {
        setFilters((prev) => ({ ...prev, [field]: value }));
        setOffset(0);
    }

    function handleSortChange(column: keyof RaceResult) {
        setSortConfig((prev) => ({
            column,
            direction:
                prev.column === column && prev.direction === "asc"
                    ? "desc"
                    : "asc",
        }));
    }

    function handleLimitChange(newLimit: number) {
        setLimit(newLimit);
        setOffset(0);
    }

    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-maroon-600 to-purple-600">
                        <svg
                            className="h-6 w-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </div>
                    <h1 className="bg-gradient-to-r from-maroon-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent">
                        Race Results
                    </h1>
                </div>

                <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-7">
                        <div>
                            <label className="mb-2 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Person ID
                            </label>
                            <Input
                                value={filters.personId}
                                onChange={(v) =>
                                    handleFilterChange("personId", v)
                                }
                                placeholder="Search..."
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Race Type
                            </label>
                            <Select
                                value={filters.raceType}
                                onChange={(v) =>
                                    handleFilterChange("raceType", v)
                                }
                                options={RACE_TYPES}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Race
                            </label>
                            <Select
                                value={filters.raceName}
                                onChange={(v) =>
                                    handleFilterChange("raceName", v)
                                }
                                options={RACES}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Distance
                            </label>
                            <Select
                                value={filters.distance}
                                onChange={(v) =>
                                    handleFilterChange("distance", v)
                                }
                                options={DISTANCES}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Age Group
                            </label>
                            <Select
                                value={filters.ageGroup}
                                onChange={(v) =>
                                    handleFilterChange("ageGroup", v)
                                }
                                options={AGE_GROUPS}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Gender
                            </label>
                            <Select
                                value={filters.gender}
                                onChange={(v) =>
                                    handleFilterChange("gender", v)
                                }
                                options={GENDERS}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Time (ms)
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    value={filters.minTime}
                                    onChange={(v) =>
                                        handleFilterChange("minTime", v)
                                    }
                                    placeholder="Min"
                                    type="number"
                                />
                                <Input
                                    value={filters.maxTime}
                                    onChange={(v) =>
                                        handleFilterChange("maxTime", v)
                                    }
                                    placeholder="Max"
                                    type="number"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-400">Show</span>
                        <Select
                            value={String(limit)}
                            onChange={(v) => handleLimitChange(Number(v))}
                            options={LIMITS.map(String)}
                            className="w-20"
                        />
                        <span className="text-sm text-zinc-400">entries</span>
                    </div>

                    <div className="text-sm text-zinc-400">
                        Showing {totalCount > 0 ? offset + 1 : 0} to{" "}
                        {Math.min(offset + limit, totalCount)} of {totalCount}{" "}
                        results
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-xl backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-800/50">
                                    <th
                                        onClick={() =>
                                            handleSortChange("person_id")
                                        }
                                        className="cursor-pointer px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-purple-400"
                                    >
                                        <div className="flex items-center gap-1">
                                            ID{" "}
                                            {sortConfig.column ===
                                                "person_id" && (
                                                <span className="text-purple-400">
                                                    {sortConfig.direction ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() =>
                                            handleSortChange("race_type")
                                        }
                                        className="cursor-pointer px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-purple-400"
                                    >
                                        <div className="flex items-center gap-1">
                                            Type{" "}
                                            {sortConfig.column ===
                                                "race_type" && (
                                                <span className="text-purple-400">
                                                    {sortConfig.direction ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() =>
                                            handleSortChange("race_name")
                                        }
                                        className="cursor-pointer px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-purple-400"
                                    >
                                        <div className="flex items-center gap-1">
                                            Race{" "}
                                            {sortConfig.column ===
                                                "race_name" && (
                                                <span className="text-purple-400">
                                                    {sortConfig.direction ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() =>
                                            handleSortChange("distance")
                                        }
                                        className="cursor-pointer px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-purple-400"
                                    >
                                        <div className="flex items-center gap-1">
                                            Dist{" "}
                                            {sortConfig.column ===
                                                "distance" && (
                                                <span className="text-purple-400">
                                                    {sortConfig.direction ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() =>
                                            handleSortChange("time_ms")
                                        }
                                        className="cursor-pointer px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-purple-400"
                                    >
                                        <div className="flex items-center gap-1">
                                            Time{" "}
                                            {sortConfig.column ===
                                                "time_ms" && (
                                                <span className="text-purple-400">
                                                    {sortConfig.direction ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() =>
                                            handleSortChange("event_date")
                                        }
                                        className="cursor-pointer px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-purple-400"
                                    >
                                        <div className="flex items-center gap-1">
                                            Date{" "}
                                            {sortConfig.column ===
                                                "event_date" && (
                                                <span className="text-purple-400">
                                                    {sortConfig.direction ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() =>
                                            handleSortChange("age_group")
                                        }
                                        className="cursor-pointer px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-purple-400"
                                    >
                                        <div className="flex items-center gap-1">
                                            Age{" "}
                                            {sortConfig.column ===
                                                "age_group" && (
                                                <span className="text-purple-400">
                                                    {sortConfig.direction ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() =>
                                            handleSortChange("gender")
                                        }
                                        className="cursor-pointer px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-purple-400"
                                    >
                                        <div className="flex items-center gap-1">
                                            Sex{" "}
                                            {sortConfig.column === "gender" && (
                                                <span className="text-purple-400">
                                                    {sortConfig.direction ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Swim
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Swim T
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Bike
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Bike T
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Run
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Run T
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        T1
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        T2
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={16}
                                            className="px-6 py-12 text-center text-zinc-500"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <svg
                                                    className="h-5 w-5 animate-spin text-purple-500"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                    />
                                                </svg>
                                                Loading...
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td
                                            colSpan={16}
                                            className="px-6 py-12 text-center text-red-400"
                                        >
                                            Error: {error}
                                        </td>
                                    </tr>
                                ) : results.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={16}
                                            className="px-6 py-12 text-center text-zinc-500"
                                        >
                                            No results found
                                        </td>
                                    </tr>
                                ) : (
                                    results.map((result) => (
                                        <tr
                                            key={result.id}
                                            className="transition-colors hover:bg-zinc-800/30"
                                        >
                                            <td className="whitespace-nowrap px-2 py-3 text-sm font-medium text-zinc-100">
                                                {result.person_id}
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3">
                                                <RaceTypeBadge
                                                    type={result.race_type}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-300">
                                                {result.race_name}
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-400">
                                                <NullValue
                                                    value={result.distance}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm font-semibold">
                                                <TimeValue
                                                    ms={result.time_ms}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-400">
                                                {new Date(
                                                    result.event_date,
                                                ).toLocaleDateString()}
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-400">
                                                <NullValue
                                                    value={result.age_group}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-400">
                                                <NullValue
                                                    value={result.gender}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-500">
                                                <NullValue
                                                    value={result.swim_distance}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-500">
                                                <TimeValue
                                                    ms={result.swim_time_ms}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-500">
                                                <NullValue
                                                    value={result.bike_distance}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-500">
                                                <TimeValue
                                                    ms={result.bike_time_ms}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-500">
                                                <NullValue
                                                    value={result.run_distance}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-500">
                                                <TimeValue
                                                    ms={result.run_time_ms}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-500">
                                                <TimeValue
                                                    ms={
                                                        result.transition1_time_ms
                                                    }
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-500">
                                                <TimeValue
                                                    ms={
                                                        result.transition2_time_ms
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <button
                        onClick={() => setOffset(offset - limit)}
                        disabled={offset === 0}
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-purple-500 hover:text-purple-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-700 disabled:hover:text-zinc-300"
                    >
                        Previous
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-400">Page</span>
                        <span className="rounded-lg bg-purple-500/20 px-3 py-1 text-sm font-semibold text-purple-400">
                            {currentPage}
                        </span>
                        <span className="text-sm text-zinc-400">
                            of {totalPages || 1}
                        </span>
                    </div>
                    <button
                        onClick={() => setOffset(offset + limit)}
                        disabled={offset + limit >= totalCount}
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-purple-500 hover:text-purple-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-700 disabled:hover:text-zinc-300"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
