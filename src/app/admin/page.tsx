"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/lib/supabase";

interface ParsedRow {
    bib: number;
    name: string;
    team: string;
    city: string;
    gender: string;
    age: number | null;
    division: string;
    time_swim: string;
    time_t1: string;
    time_bike: string;
    time_t2: string;
    time_run: string;
    time_chip: string;
    rank_swim: number | null;
    rank_t1: number | null;
    rank_bike: number | null;
    rank_t2: number | null;
    rank_run: number | null;
    rank_chip: number | null;
}

interface RaceInfo {
    race_name: string;
    race_type: string;
    race_date: string;
    meters_swim: number;
    meters_bike: number;
    meters_run: number;
}

export default function AdminPage() {
    const { user, isAdmin } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ParsedRow[]>([]);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [raceInfo, setRaceInfo] = useState<RaceInfo>({
        race_name: "",
        race_type: "Sprint",
        race_date: new Date().toISOString().split("T")[0],
        meters_swim: 750,
        meters_bike: 20,
        meters_run: 5,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith(".csv")) {
            setMessage({ type: "error", text: "Please select a CSV file" });
            return;
        }

        setFile(selectedFile);
        setMessage(null);
        setPreview([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSV(text);
            setPreview(parsed.slice(0, 5));
        };
        reader.readAsText(selectedFile);
    };

    const handleUpload = async () => {
        if (!file || !supabase) {
            setMessage({ type: "error", text: "No file selected or Supabase not configured" });
            return;
        }

        if (!raceInfo.race_name) {
            setMessage({ type: "error", text: "Please enter race name" });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (!supabase) return;

                const text = event.target?.result as string;
                const rows = parseCSV(text);

                const { data: race, error: raceError } = await supabase
                    .from("races")
                    .insert({
                        race_name: raceInfo.race_name,
                        race_type: raceInfo.race_type,
                        race_date: raceInfo.race_date,
                        meters_swim: raceInfo.meters_swim,
                        meters_bike: raceInfo.meters_bike,
                        meters_run: raceInfo.meters_run,
                    })
                    .select()
                    .single();

                if (raceError) throw raceError;

                const athleteMap = new Map<string, number>();
                const athleteInserts: { name: string; team: string | null; city: string | null; gender: string | null }[] = [];

                for (const row of rows) {
                    const athleteKey = `${row.name.toLowerCase()}-${(row.team || "").toLowerCase()}`;
                    if (!athleteMap.has(athleteKey)) {
                        athleteInserts.push({
                            name: row.name,
                            team: row.team || null,
                            city: row.city || null,
                            gender: row.gender || null,
                        });
                        athleteMap.set(athleteKey, -1);
                    }
                }

                if (athleteInserts.length > 0) {
                    const { data: athletes, error: athleteError } = await supabase
                        .from("athletes")
                        .upsert(athleteInserts, { onConflict: "name" })
                        .select();

                    if (athleteError) throw athleteError;

                    for (let i = 0; i < athletes.length; i++) {
                        const athleteKey = `${athleteInserts[i].name.toLowerCase()}-${(athleteInserts[i].team || "").toLowerCase()}`;
                        athleteMap.set(athleteKey, athletes[i].id);
                    }
                }

                const resultInserts = rows
                    .filter((row) => row.name && row.bib)
                    .map((row) => {
                        const athleteKey = `${row.name.toLowerCase()}-${(row.team || "").toLowerCase()}`;
                        const athleteId = athleteMap.get(athleteKey);

                        return {
                            race_id: race.id,
                            athlete_id: athleteId,
                            athlete_bib: row.bib,
                            athlete_division: row.division || "Collegiate",
                            athlete_age: row.age,
                            time_swim: parseInterval(row.time_swim),
                            rank_swim: row.rank_swim,
                            time_t1: parseInterval(row.time_t1),
                            rank_t1: row.rank_t1,
                            time_bike: parseInterval(row.time_bike),
                            rank_bike: row.rank_bike,
                            time_t2: parseInterval(row.time_t2),
                            rank_t2: row.rank_t2,
                            time_run: parseInterval(row.time_run),
                            rank_run: row.rank_run,
                            time_chip: parseInterval(row.time_chip),
                            rank_chip: row.rank_chip,
                        };
                    })
                    .filter((r) => r.athlete_id);

                if (resultInserts.length > 0) {
                    const { error: insertError } = await supabase
                        .from("results")
                        .upsert(resultInserts, { onConflict: "race_id,athlete_bib" });

                    if (insertError) throw insertError;
                }

                setMessage({ type: "success", text: `Successfully uploaded ${resultInserts.length} results for race "${raceInfo.race_name}"` });
                setFile(null);
                setPreview([]);
                setRaceInfo({
                    race_name: "",
                    race_type: "Sprint",
                    race_date: new Date().toISOString().split("T")[0],
                    meters_swim: 750,
                    meters_bike: 20,
                    meters_run: 5,
                });
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            };
            reader.readAsText(file);
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <h1 className="mb-8 text-2xl font-bold text-zinc-100">Upload Race Results</h1>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
                <h2 className="mb-4 text-lg font-semibold text-zinc-100">CSV Upload</h2>
                <p className="mb-4 text-sm text-zinc-400">
                    Upload a CSV file with race results. The race details will be requested after selecting the file.
                </p>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="mb-4 block w-full text-sm text-zinc-400
                        file:mr-4 file:rounded-lg file:border-0
                        file:bg-purple-600 file:px-4 file:py-2
                        file:text-sm file:font-medium file:text-white
                        file:cursor-pointer file:transition-all
                        hover:file:bg-purple-500"
                />

                {message && (
                    <div
                        className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                            message.type === "success"
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                : "bg-red-500/10 border border-red-500/30 text-red-400"
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                {preview.length > 0 && (
                    <div className="mb-6">
                        <h3 className="mb-2 text-sm font-medium text-zinc-300">Preview (first 5 rows)</h3>
                        <div className="overflow-x-auto rounded-lg border border-zinc-700">
                            <table className="min-w-full text-sm">
                                <thead className="bg-zinc-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-zinc-400">Bib</th>
                                        <th className="px-3 py-2 text-left text-zinc-400">Name</th>
                                        <th className="px-3 py-2 text-left text-zinc-400">Team</th>
                                        <th className="px-3 py-2 text-left text-zinc-400">Division</th>
                                        <th className="px-3 py-2 text-left text-zinc-400">Chip Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-700">
                                    {preview.map((row, i) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2 text-zinc-300">{row.bib}</td>
                                            <td className="px-3 py-2 text-zinc-300">{row.name}</td>
                                            <td className="px-3 py-2 text-zinc-300">{row.team}</td>
                                            <td className="px-3 py-2 text-zinc-300">{row.division || "Collegiate"}</td>
                                            <td className="px-3 py-2 text-zinc-300">{row.time_chip}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {preview.length > 0 && (
                    <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800/30 p-4">
                        <h3 className="mb-4 text-sm font-medium text-zinc-300">Race Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs text-zinc-400">Race Name</label>
                                <input
                                    type="text"
                                    value={raceInfo.race_name}
                                    onChange={(e) => setRaceInfo({ ...raceInfo, race_name: e.target.value })}
                                    placeholder="e.g., Aggieathlon 2025"
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-zinc-400">Race Type</label>
                                <select
                                    value={raceInfo.race_type}
                                    onChange={(e) => setRaceInfo({ ...raceInfo, race_type: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none"
                                >
                                    <option value="Sprint">Sprint</option>
                                    <option value="Olympic">Olympic</option>
                                    <option value="Half">Half Ironman</option>
                                    <option value="Full">Full Ironman</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-zinc-400">Race Date</label>
                                <input
                                    type="date"
                                    value={raceInfo.race_date}
                                    onChange={(e) => setRaceInfo({ ...raceInfo, race_date: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-zinc-400">Swim (meters)</label>
                                <input
                                    type="number"
                                    value={raceInfo.meters_swim}
                                    onChange={(e) => setRaceInfo({ ...raceInfo, meters_swim: parseInt(e.target.value) || 0 })}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-zinc-400">Bike (km)</label>
                                <input
                                    type="number"
                                    value={raceInfo.meters_bike}
                                    onChange={(e) => setRaceInfo({ ...raceInfo, meters_bike: parseInt(e.target.value) || 0 })}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-zinc-400">Run (km)</label>
                                <input
                                    type="number"
                                    value={raceInfo.meters_run}
                                    onChange={(e) => setRaceInfo({ ...raceInfo, meters_run: parseInt(e.target.value) || 0 })}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={!file || !raceInfo.race_name || uploading}
                    className="rounded-lg bg-gradient-to-r from-purple-600 to-maroon-600 px-6 py-2.5 font-medium text-white transition-all hover:from-purple-500 hover:to-maroon-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {uploading ? "Uploading..." : "Upload Results"}
                </button>
            </div>

            <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
                <h2 className="mb-4 text-lg font-semibold text-zinc-100">Debug Info</h2>
                <div className="space-y-2 text-sm text-zinc-400">
                    <p>User: {user?.email || "Not logged in"}</p>
                    <p>Is Admin: {isAdmin ? "Yes" : "No"}</p>
                    <p>User ID: {user?.id || "N/A"}</p>
                </div>
            </div>
        </div>
    );
}

function parseCSV(text: string): ParsedRow[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

    const hasDivision = headers.includes("division");
    const hasT1Rank = headers.includes("t1_rank");
    const hasT2Rank = headers.includes("t2_rank");
    const hasChipRank = headers.includes("finish_rank") || headers.includes("overall_rank");

    const getColIndex = (name: string) => headers.indexOf(name);
    const bibIdx = getColIndex("bib");
    const nameIdx = getColIndex("name");
    const teamIdx = getColIndex("team_name") || getColIndex("team");
    const cityIdx = getColIndex("city");
    const genderIdx = getColIndex("gender");
    const ageIdx = getColIndex("age");
    const divisionIdx = getColIndex("division");
    const swimIdx = getColIndex("swim");
    const t1Idx = getColIndex("t1");
    const bikeIdx = getColIndex("bike");
    const t2Idx = getColIndex("t2");
    const runIdx = getColIndex("run");
    const chipIdx = getColIndex("chip_elapsed");
    const swimRankIdx = getColIndex("swim_rank");
    const t1RankIdx = hasT1Rank ? getColIndex("t1_rank") : -1;
    const bikeRankIdx = getColIndex("bike_rank");
    const t2RankIdx = hasT2Rank ? getColIndex("t2_rank") : -1;
    const runRankIdx = getColIndex("run_rank");
    const chipRankIdx = hasChipRank ? (getColIndex("finish_rank") !== -1 ? getColIndex("finish_rank") : getColIndex("overall_rank")) : -1;

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = parseCSVLine(line);

        const bib = parseInt(values[bibIdx], 10);
        const name = values[nameIdx]?.trim();
        if (!name || isNaN(bib)) continue;

        const team = teamIdx !== -1 ? values[teamIdx]?.trim() : "";
        const city = cityIdx !== -1 ? values[cityIdx]?.trim() : "";
        const gender = genderIdx !== -1 ? values[genderIdx]?.trim() : "";
        const age = ageIdx !== -1 ? parseAge(values[ageIdx]) : null;
        const division = divisionIdx !== -1 ? values[divisionIdx]?.trim() : "";

        const time_swim = swimIdx !== -1 ? values[swimIdx]?.trim() : "";
        const time_t1 = t1Idx !== -1 ? values[t1Idx]?.trim() : "";
        const time_bike = bikeIdx !== -1 ? values[bikeIdx]?.trim() : "";
        const time_t2 = t2Idx !== -1 ? values[t2Idx]?.trim() : "";
        const time_run = runIdx !== -1 ? values[runIdx]?.trim() : "";
        const time_chip = chipIdx !== -1 ? values[chipIdx]?.trim() : "";

        const rank_swim = swimRankIdx !== -1 ? parseRank(values[swimRankIdx]) : null;
        const rank_t1 = t1RankIdx !== -1 ? parseRank(values[t1RankIdx]) : null;
        const rank_bike = bikeRankIdx !== -1 ? parseRank(values[bikeRankIdx]) : null;
        const rank_t2 = t2RankIdx !== -1 ? parseRank(values[t2RankIdx]) : null;
        const rank_run = runRankIdx !== -1 ? parseRank(values[runRankIdx]) : null;
        const rank_chip = chipRankIdx !== -1 ? parseRank(values[chipRankIdx]) : null;

        rows.push({
            bib,
            name,
            team,
            city,
            gender,
            age,
            division: division || "Collegiate",
            time_swim,
            time_t1,
            time_bike,
            time_t2,
            time_run,
            time_chip,
            rank_swim,
            rank_t1,
            rank_bike,
            rank_t2,
            rank_run,
            rank_chip,
        });
    }

    return rows;
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

function parseAge(value: string | undefined): number | null {
    if (!value || value === "N/A") return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
}

function parseRank(value: string | undefined): number | null {
    if (!value || value === "" || value === "N/A") return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
}

function parseInterval(value: string): string | null {
    if (!value || value === "" || value === "N/A") return null;

    const match = value.match(/^(\d+):(\d{2}):?(\d{2})?$/);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}