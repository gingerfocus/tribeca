"use client";

import { DisplayRow, isSantaClara, formatTime, median } from "@/lib/triathlon";

export function ScuSummary({ raceResults }: { raceResults: DisplayRow[] }) {
    const scuAthletes = raceResults.filter((r) => isSantaClara(r.team));
    if (scuAthletes.length === 0) return null;

    const fieldAvgMs = median(raceResults.map((r) => r.chip_ms));
    const scuTimes   = scuAthletes.map((r) => r.chip_ms);
    const scuFastest = Math.min(...scuTimes);
    const scuAvgMs   = median(scuTimes);
    const scuVsField = scuAvgMs - fieldAvgMs;

    const scuMen   = scuAthletes.filter((r) => r.gender === "M").sort((a, b) => a.chip_ms - b.chip_ms);
    const scuWomen = scuAthletes.filter((r) => r.gender === "F").sort((a, b) => a.chip_ms - b.chip_ms);
    const topScuOverall = [...scuAthletes].sort((a, b) => a.chip_ms - b.chip_ms).slice(0, 3);

    const scuWithSplits   = scuAthletes.filter((r) => r.swim_ms && r.bike_ms && r.run_ms);
    const fieldWithSplits = raceResults.filter((r) => r.swim_ms && r.bike_ms && r.run_ms);

    function segAvg(rows: DisplayRow[], key: keyof DisplayRow) {
        if (!rows.length) return null;
        const vals = rows.map((r) => r[key] as number).filter(Boolean);
        return vals.length ? median(vals) : null;
    }

    const segments = [
        { label: "Swim", scuAvg: segAvg(scuWithSplits, "swim_ms"), fieldAvg: segAvg(fieldWithSplits, "swim_ms"), color: "#2563eb" },
        { label: "T1",   scuAvg: segAvg(scuWithSplits, "t1_ms"),   fieldAvg: segAvg(fieldWithSplits, "t1_ms"),   color: "#9ca3af" },
        { label: "Bike", scuAvg: segAvg(scuWithSplits, "bike_ms"), fieldAvg: segAvg(fieldWithSplits, "bike_ms"), color: "#ea580c" },
        { label: "T2",   scuAvg: segAvg(scuWithSplits, "t2_ms"),   fieldAvg: segAvg(fieldWithSplits, "t2_ms"),   color: "#9ca3af" },
        { label: "Run",  scuAvg: segAvg(scuWithSplits, "run_ms"),  fieldAvg: segAvg(fieldWithSplits, "run_ms"),  color: "#16a34a" },
    ];

    return (
        <div className="rounded-xl border border-cardinal-200 bg-cardinal-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cardinal-800">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-cardinal-900">Santa Clara University</h2>
                    <p className="text-xs text-cardinal-600">
                        {scuAthletes.length} athlete{scuAthletes.length !== 1 ? "s" : ""} · {Math.round((scuAthletes.length / raceResults.length) * 100)}% of field
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Key stats */}
                <div className="grid grid-cols-2 gap-3 lg:col-span-1">
                    <div className="rounded-lg border border-cardinal-200 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Fastest</p>
                        <p className="mt-1 font-mono text-xl font-bold text-cardinal-800">{formatTime(scuFastest)}</p>
                    </div>
                    <div className="rounded-lg border border-cardinal-200 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">SCU Median</p>
                        <p className="mt-1 font-mono text-xl font-bold text-cardinal-800">{formatTime(scuAvgMs)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">vs. Field Median</p>
                        <p className={`mt-1 font-mono text-xl font-bold ${scuVsField < 0 ? "text-green-600" : "text-red-600"}`}>
                            {scuVsField < 0 ? "-" : "+"}{formatTime(Math.abs(scuVsField))}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Gender</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">
                            {scuMen.length}<span className="ml-1 text-xs font-normal text-gray-400">M</span>
                            <span className="mx-2 text-gray-300">/</span>
                            {scuWomen.length}<span className="ml-1 text-xs font-normal text-gray-400">F</span>
                        </p>
                    </div>
                </div>

                {/* Top finishers */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-1">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Top SCU Finishers</p>
                    <div className="space-y-2">
                        {topScuOverall.map((r, i) => (
                            <div key={r.result_id} className="flex items-center gap-3">
                                <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    i === 0 ? "bg-yellow-100 text-yellow-700" :
                                    i === 1 ? "bg-gray-100 text-gray-500" :
                                              "bg-orange-100 text-orange-600"
                                }`}>{i + 1}</span>
                                <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{r.name}</span>
                                <span className="text-xs text-gray-400">{r.gender}</span>
                                <span className="font-mono text-xs font-semibold text-cardinal-700">{formatTime(r.chip_ms)}</span>
                            </div>
                        ))}
                    </div>
                    {(scuMen.length > 0 || scuWomen.length > 0) && (
                        <div className="mt-3 border-t border-gray-100 pt-3">
                            <p className="mb-2 text-xs font-medium text-gray-400">Best by gender</p>
                            <div className="space-y-1.5">
                                {scuMen[0] && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="w-3 font-semibold text-blue-600">M</span>
                                        <span className="flex-1 truncate text-gray-700">{scuMen[0].name}</span>
                                        <span className="font-mono font-semibold text-cardinal-700">{formatTime(scuMen[0].chip_ms)}</span>
                                    </div>
                                )}
                                {scuWomen[0] && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="w-3 font-semibold text-pink-500">F</span>
                                        <span className="flex-1 truncate text-gray-700">{scuWomen[0].name}</span>
                                        <span className="font-mono font-semibold text-cardinal-700">{formatTime(scuWomen[0].chip_ms)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Split comparison */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-1">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">SCU Median Splits vs. Field</p>
                    <div className="space-y-2.5">
                        {segments.filter((s) => s.scuAvg && s.fieldAvg).map((seg) => {
                            const delta    = (seg.scuAvg ?? 0) - (seg.fieldAvg ?? 0);
                            const pct      = Math.abs(delta) / (seg.fieldAvg ?? 1);
                            const barWidth = Math.min(pct * 400, 100);
                            return (
                                <div key={seg.label} className="flex items-center gap-3">
                                    <span className="w-8 text-xs font-medium" style={{ color: seg.color }}>{seg.label}</span>
                                    <div className="flex flex-1 items-center gap-2">
                                        <span className="w-12 text-right font-mono text-xs text-gray-500">{seg.scuAvg ? formatTime(seg.scuAvg) : "—"}</span>
                                        <div className="relative flex-1">
                                            <div className="h-1.5 w-full rounded-full bg-gray-100" />
                                            {delta !== 0 && (
                                                <div
                                                    className={`absolute top-0 h-1.5 rounded-full ${delta < 0 ? "bg-green-500" : "bg-red-400"}`}
                                                    style={{ width: `${barWidth}%`, left: delta < 0 ? 0 : `${100 - barWidth}%` }}
                                                />
                                            )}
                                        </div>
                                        <span className={`w-14 text-right font-mono text-xs font-medium ${delta < 0 ? "text-green-600" : "text-red-500"}`}>
                                            {delta < 0 ? "-" : "+"}{formatTime(Math.abs(delta))}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
