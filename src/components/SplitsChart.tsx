"use client";

import { DisplayRow, isSantaClara, formatTime } from "@/lib/triathlon";

export function SplitsChart({ result, avgResult }: { result: DisplayRow; avgResult: DisplayRow }) {
    const segments = [
        { key: "swim", label: "Swim", color: "#2563eb", ms: result.swim_ms, avgMs: avgResult.swim_ms },
        { key: "t1",   label: "T1",   color: "#9ca3af", ms: result.t1_ms,   avgMs: avgResult.t1_ms   },
        { key: "bike", label: "Bike", color: "#ea580c", ms: result.bike_ms, avgMs: avgResult.bike_ms  },
        { key: "t2",   label: "T2",   color: "#9ca3af", ms: result.t2_ms,   avgMs: avgResult.t2_ms   },
        { key: "run",  label: "Run",  color: "#16a34a", ms: result.run_ms,  avgMs: avgResult.run_ms   },
    ];

    const total    = segments.reduce((s, seg) => s + (seg.ms    ?? 0), 0) || result.chip_ms;
    const avgTotal = segments.reduce((s, seg) => s + (seg.avgMs ?? 0), 0) || avgResult.chip_ms;
    const isSC     = isSantaClara(result.team);

    const Bar = ({ segs, totalMs, dim }: { segs: typeof segments; totalMs: number; dim?: boolean }) => (
        <div className={`flex h-9 w-full overflow-hidden rounded-lg ${dim ? "opacity-40" : ""}`}>
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
                        <span className="text-gray-500"> {msVal ? formatTime(msVal) : "—"}</span>
                    </span>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{result.name}</span>
                <span className="text-xs text-gray-400">#{result.bib}</span>
                {isSC && (
                    <span className="rounded-full border border-cardinal-200 bg-cardinal-50 px-2 py-0.5 text-xs font-medium text-cardinal-700">
                        Santa Clara
                    </span>
                )}
                {result.team && !isSC && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{result.team}</span>
                )}
                <span className="ml-auto font-mono text-sm font-semibold text-cardinal-700">{formatTime(result.chip_ms)}</span>
            </div>

            <div>
                <p className="mb-1.5 text-xs text-gray-400">Athlete splits</p>
                <Bar segs={segments} totalMs={total} />
                <Legend segs={segments} />
            </div>

            <div>
                <p className="mb-1.5 text-xs text-gray-400">Field median</p>
                <Bar segs={segments} totalMs={avgTotal} dim />
                <Legend segs={segments} dim />
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="mb-2 text-xs font-medium text-gray-400">vs. field median</p>
                <div className="flex flex-wrap gap-4">
                    {segments.filter((s) => s.ms && s.avgMs).map((seg) => {
                        const delta = (seg.ms ?? 0) - (seg.avgMs ?? 0);
                        return (
                            <span key={seg.key} className="text-xs">
                                <span style={{ color: seg.color }} className="font-medium">{seg.label}</span>
                                <span className={delta < 0 ? "text-green-600" : "text-red-500"}>
                                    {" "}{delta < 0 ? "-" : "+"}{formatTime(Math.abs(delta))}
                                </span>
                            </span>
                        );
                    })}
                    <span className="ml-auto text-xs">
                        <span className="text-gray-400">Total </span>
                        {(() => {
                            const d = result.chip_ms - avgResult.chip_ms;
                            return <span className={d < 0 ? "font-semibold text-green-600" : "font-semibold text-red-500"}>{d < 0 ? "-" : "+"}{formatTime(Math.abs(d))}</span>;
                        })()}
                    </span>
                </div>
            </div>
        </div>
    );
}
