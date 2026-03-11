"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { DisplayRow, formatTime, swimPaceStr, bikePaceStr, runPaceStr, isSantaClara } from "@/lib/triathlon";

const columnHelper = createColumnHelper<DisplayRow>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const columns: any[] = [
    columnHelper.accessor("bib", {
        header: "Bib",
        cell: ({ getValue }) => (
            <span className="font-mono text-gray-400">{getValue()}</span>
        ),
    }),
    columnHelper.accessor("name", {
        header: "Athlete",
        cell: ({ getValue }) => (
            <span className="font-medium text-gray-800 whitespace-nowrap">{getValue()}</span>
        ),
    }),
    columnHelper.accessor("division", {
        header: "Division",
        cell: ({ getValue }) => (
            <span className="text-gray-500">{getValue()}</span>
        ),
    }),
    columnHelper.accessor("team", {
        header: "Team",
        cell: ({ getValue }) => {
            const team = getValue();
            if (!team) return <span className="text-gray-200">—</span>;
            const sc = isSantaClara(team);
            return (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    sc ? "border border-cardinal-200 bg-cardinal-50 text-cardinal-700"
                        : "bg-gray-100 text-gray-500"
                }`}>{team}</span>
            );
        },
    }),
    columnHelper.accessor("gender", {
        header: "Sex",
        cell: ({ getValue }) => getValue() ?? <span className="text-gray-200">—</span>,
    }),
    columnHelper.accessor("chip_ms", {
        header: "Total",
        cell: ({ getValue }) => (
            <span className="font-mono font-semibold text-cardinal-700">{formatTime(getValue())}</span>
        ),
    }),
    columnHelper.accessor("swim_ms", {
        header: "Swim",
        cell: ({ row }) => {
            const ms = row.original.swim_ms;
            return ms ? (
                <span className="font-mono text-gray-600">{formatTime(ms)}</span>
            ) : (
                <span className="text-gray-200">—</span>
            );
        },
    }),
    columnHelper.display({
        id: "swimPace",
        header: "Pace",
        cell: ({ row }) => (
            <span className="text-xs text-gray-400">
                {swimPaceStr(row.original.swim_ms, row.original.race_swim_km)}
            </span>
        ),
    }),
    columnHelper.accessor("t1_ms", {
        header: "T1",
        cell: ({ getValue }) => {
            const ms = getValue();
            return ms ? (
                <span className="font-mono text-gray-400">{formatTime(ms)}</span>
            ) : (
                <span className="text-gray-200">—</span>
            );
        },
    }),
    columnHelper.accessor("bike_ms", {
        header: "Bike",
        cell: ({ getValue }) => {
            const ms = getValue();
            return ms ? (
                <span className="font-mono text-gray-600">{formatTime(ms)}</span>
            ) : (
                <span className="text-gray-200">—</span>
            );
        },
    }),
    columnHelper.display({
        id: "bikeSpeed",
        header: "Speed",
        cell: ({ row }) => (
            <span className="text-xs text-gray-400">
                {bikePaceStr(row.original.bike_ms, row.original.race_bike_km)}
            </span>
        ),
    }),
    columnHelper.accessor("t2_ms", {
        header: "T2",
        cell: ({ getValue }) => {
            const ms = getValue();
            return ms ? (
                <span className="font-mono text-gray-400">{formatTime(ms)}</span>
            ) : (
                <span className="text-gray-200">—</span>
            );
        },
    }),
    columnHelper.accessor("run_ms", {
        header: "Run",
        cell: ({ getValue }) => {
            const ms = getValue();
            return ms ? (
                <span className="font-mono text-gray-600">{formatTime(ms)}</span>
            ) : (
                <span className="text-gray-200">—</span>
            );
        },
    }),
    columnHelper.display({
        id: "runPace",
        header: "Pace",
        cell: ({ row }) => (
            <span className="text-xs text-gray-400">
                {runPaceStr(row.original.run_ms, row.original.race_run_km)}
            </span>
        ),
    }),
];