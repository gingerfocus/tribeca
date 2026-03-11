"use client";

import { useState, useRef, useEffect } from "react";
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
}

interface RaceInfo {
    race_name: string;
    race_type: string;
    race_date: string;
    meters_swim: number;
    meters_bike: number;
    meters_run: number;
}

interface ColumnMapping {
    [dbField: string]: string;
}

interface SavedMapping {
    name: string;
    mapping: ColumnMapping;
}

const DB_FIELDS = [
    { key: "bib", label: "Bib Number", required: true },
    { key: "name", label: "Athlete Name", required: true },
    { key: "team", label: "Team Name", required: false },
    { key: "city", label: "City", required: false },
    { key: "gender", label: "Gender", required: false },
    { key: "age", label: "Age", required: false },
    { key: "division", label: "Division", required: false },
    { key: "time_swim", label: "Swim Time", required: false },
    { key: "time_t1", label: "T1 Time", required: false },
    { key: "time_bike", label: "Bike Time", required: false },
    { key: "time_t2", label: "T2 Time", required: false },
    { key: "time_run", label: "Run Time", required: false },
    { key: "time_chip", label: "Chip Time", required: false },
];

const AUTO_DETECT_MAPPINGS: { [key: string]: string[] } = {
    bib: ["bib", "bib_number", "bib#", "number"],
    name: ["name", "athlete_name", "athlete", "full_name"],
    team: ["team", "team_name", "teamname", "school", "club"],
    city: ["city", "location", "hometown"],
    gender: ["gender", "sex"],
    age: ["age", "age_at_race", "age_group"],
    division: ["division", "div", "category", "class"],
    time_swim: ["swim", "swim_time", "swim_time_ms"],
    time_t1: ["t1", "t1_time", "transition_1", "trans1"],
    time_bike: ["bike", "bike_time", "cycling", "cycle"],
    time_t2: ["t2", "t2_time", "transition_2", "trans2"],
    time_run: ["run", "run_time", "running", "final"],
    time_chip: ["chip_elapsed", "chip_time", "chip", "elapsed", "total_time", "finish_time", "time"],
};

export default function AdminPage() {
    const { user, isAdmin } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<ColumnMapping>({});
    const [preview, setPreview] = useState<ParsedRow[]>([]);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showMapping, setShowMapping] = useState(false);
    const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([]);
    const [mappingName, setMappingName] = useState("");
    const [raceInfo, setRaceInfo] = useState<RaceInfo>({
        race_name: "",
        race_type: "Sprint",
        race_date: new Date().toISOString().split("T")[0],
        meters_swim: 750,
        meters_bike: 20,
        meters_run: 5,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const stored = localStorage.getItem("csv_mappings");
        if (stored) {
            setSavedMappings(JSON.parse(stored));
        }
    }, []);

    const autoDetectMapping = (headers: string[]): ColumnMapping => {
        const detected: ColumnMapping = {};
        const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/\s+/g, "_"));

        for (const dbField of DB_FIELDS) {
            const variants = AUTO_DETECT_MAPPINGS[dbField.key] || [];
            const foundIdx = normalizedHeaders.findIndex((h) =>
                variants.some((v) => h.includes(v) || v.includes(h))
            );
            if (foundIdx !== -1) {
                detected[dbField.key] = headers[foundIdx];
            }
        }

        return detected;
    };

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
        setShowMapping(false);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.trim().split("\n");
            if (lines.length < 2) return;

            const headers = parseCSVLine(lines[0]);
            setCsvHeaders(headers);

            const detected = autoDetectMapping(headers);
            setMapping(detected);

            const parsed = parseCSVWithMapping(text, detected);
            setPreview(parsed.slice(0, 5));
        };
        reader.readAsText(selectedFile);
    };

    const handleMappingChange = (dbField: string, csvColumn: string) => {
        setMapping((prev) => {
            if (csvColumn === "") {
                const { [dbField]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [dbField]: csvColumn };
        });
    };

    const applyMapping = () => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSVWithMapping(text, mapping);
            setPreview(parsed.slice(0, 5));
            setShowMapping(false);
        };
        reader.readAsText(file);
    };

    const saveMapping = () => {
        if (!mappingName.trim()) return;

        const newMapping = { name: mappingName, mapping };
        const updated = [...savedMappings, newMapping];
        setSavedMappings(updated);
        localStorage.setItem("csv_mappings", JSON.stringify(updated));
        setMappingName("");
    };

    const loadMapping = (saved: SavedMapping) => {
        setMapping(saved.mapping);
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const parsed = parseCSVWithMapping(text, saved.mapping);
                setPreview(parsed.slice(0, 5));
            };
            reader.readAsText(file);
        }
    };

    const deleteMapping = (name: string) => {
        const updated = savedMappings.filter((m) => m.name !== name);
        setSavedMappings(updated);
        localStorage.setItem("csv_mappings", JSON.stringify(updated));
    };

    const handleUpload = async () => {
        if (!file || !raceInfo.race_name) {
            setMessage({ type: "error", text: "Please select a file and enter race name" });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target?.result as string;

                const response = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        raceInfo,
                        mapping,
                        csvData: text,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Upload failed");
                }

                setMessage({ type: "success", text: result.message });
                setFile(null);
                setPreview([]);
                setCsvHeaders([]);
                setMapping({});
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
                    Upload a CSV file with race results. Column mappings will be auto-detected but can be adjusted.
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

                {csvHeaders.length > 0 && (
                    <div className="mb-4 flex items-center gap-4">
                        <button
                            onClick={() => setShowMapping(!showMapping)}
                            className="text-sm text-purple-400 hover:text-purple-300"
                        >
                            {showMapping ? "Hide" : "Show"} Column Mapping
                        </button>
                        {savedMappings.length > 0 && (
                            <select
                                onChange={(e) => {
                                    const saved = savedMappings.find((m) => m.name === e.target.value);
                                    if (saved) loadMapping(saved);
                                }}
                                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300"
                                defaultValue=""
                            >
                                <option value="">Load saved mapping...</option>
                                {savedMappings.map((m) => (
                                    <option key={m.name} value={m.name}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                {showMapping && csvHeaders.length > 0 && (
                    <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800/30 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-zinc-300">Column Mapping</h3>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={mappingName}
                                    onChange={(e) => setMappingName(e.target.value)}
                                    placeholder="Mapping name"
                                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500"
                                />
                                <button
                                    onClick={saveMapping}
                                    disabled={!mappingName.trim()}
                                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {DB_FIELDS.map((field) => (
                                <div key={field.key} className="flex items-center gap-2">
                                    <label className="w-28 text-sm text-zinc-400">
                                        {field.label}
                                        {field.required && <span className="text-red-400">*</span>}
                                    </label>
                                    <select
                                        value={mapping[field.key] || ""}
                                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100"
                                    >
                                        <option value="">-- Not mapped --</option>
                                        {csvHeaders.map((header) => (
                                            <option key={header} value={header}>
                                                {header}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={applyMapping}
                            className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white"
                        >
                            Apply Mapping
                        </button>
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

function parseCSVWithMapping(text: string, mapping: ColumnMapping): ParsedRow[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);

    const getMappedIndex = (dbField: string): number => {
        const csvCol = mapping[dbField];
        if (!csvCol) return -1;
        return headers.findIndex((h) => h === csvCol);
    };

    const idx = {
        bib: getMappedIndex("bib"),
        name: getMappedIndex("name"),
        team: getMappedIndex("team"),
        city: getMappedIndex("city"),
        gender: getMappedIndex("gender"),
        age: getMappedIndex("age"),
        division: getMappedIndex("division"),
        time_swim: getMappedIndex("time_swim"),
        time_t1: getMappedIndex("time_t1"),
        time_bike: getMappedIndex("time_bike"),
        time_t2: getMappedIndex("time_t2"),
        time_run: getMappedIndex("time_run"),
        time_chip: getMappedIndex("time_chip"),
    };

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = parseCSVLine(line);

        const bib = idx.bib !== -1 ? parseInt(values[idx.bib], 10) : 0;
        const name = idx.name !== -1 ? values[idx.name]?.trim() : "";
        if (!name || isNaN(bib)) continue;

        const team = idx.team !== -1 ? values[idx.team]?.trim() : "";
        const city = idx.city !== -1 ? values[idx.city]?.trim() : "";
        const gender = idx.gender !== -1 ? values[idx.gender]?.trim() : "";
        const age = idx.age !== -1 ? parseAge(values[idx.age]) : null;
        const division = idx.division !== -1 ? values[idx.division]?.trim() : "";

        const time_swim = idx.time_swim !== -1 ? values[idx.time_swim]?.trim() : "";
        const time_t1 = idx.time_t1 !== -1 ? values[idx.time_t1]?.trim() : "";
        const time_bike = idx.time_bike !== -1 ? values[idx.time_bike]?.trim() : "";
        const time_t2 = idx.time_t2 !== -1 ? values[idx.time_t2]?.trim() : "";
        const time_run = idx.time_run !== -1 ? values[idx.time_run]?.trim() : "";
        const time_chip = idx.time_chip !== -1 ? values[idx.time_chip]?.trim() : "";

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

function parseInterval(value: string): string | null {
    if (!value || value === "" || value === "N/A") return null;

    const match = value.match(/^(\d+):(\d{2}):?(\d{2})?$/);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}