"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/lib/supabase";

interface ParsedRow {
    name?: string;
    team_name?: string;
    city?: string;
    bib_number?: number;
    race_type?: string;
    race_name?: string;
    distance?: string;
    time_ms?: number;
    event_date?: string;
    age_group?: string;
    gender?: string;
    swim_distance?: string;
    bike_distance?: string;
    run_distance?: string;
    swim_time_ms?: number | undefined;
    transition1_time_ms?: number | undefined;
    bike_time_ms?: number | undefined;
    transition2_time_ms?: number | undefined;
    run_time_ms?: number | undefined;
}

export default function AdminPage() {
    const { user, isAdmin } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ParsedRow[]>([]);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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

        setUploading(true);
        setMessage(null);

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (!supabase) return;
                
                const text = event.target?.result as string;
                const rows = parseCSV(text);

                const personMap = new Map<string, string>();
                const personInserts: { name: string; team_name?: string; city?: string }[] = [];

                for (const row of rows) {
                    const personKey = `${row.name}-${row.team_name || ""}`.toLowerCase();
                    if (row.name && !personMap.has(personKey)) {
                        personInserts.push({
                            name: row.name,
                            team_name: row.team_name,
                            city: row.city,
                        });
                        personMap.set(personKey, "");
                    }
                }

                if (personInserts.length > 0) {
                    const { data: persons, error: personError } = await supabase
                        .from("person_ids")
                        .upsert(personInserts, { onConflict: "name" })
                        .select();

                    if (personError) throw personError;

                    for (let i = 0; i < personInserts.length; i++) {
                        const personKey = `${personInserts[i].name}-${personInserts[i].team_name || ""}`.toLowerCase();
                        if (persons?.[i]?.id) {
                            personMap.set(personKey, persons[i].id);
                        }
                    }
                }

                const resultInserts = rows
                    .filter((row) => row.name && row.race_name && row.time_ms)
                    .map((row) => {
                        const personKey = `${row.name}-${row.team_name || ""}`.toLowerCase();
                        const personId = personMap.get(personKey);

                        return {
                            id: personId,
                            bib_number: row.bib_number || 0,
                            race_type: row.race_type || "running",
                            race_name: row.race_name,
                            distance: row.distance,
                            time_ms: row.time_ms,
                            event_date: row.event_date || new Date().toISOString().split("T")[0],
                            age_group: row.age_group,
                            gender: row.gender,
                            swim_distance: row.swim_distance,
                            bike_distance: row.bike_distance,
                            run_distance: row.run_distance,
                            swim_time_ms: row.swim_time_ms,
                            transition1_time_ms: row.transition1_time_ms,
                            bike_time_ms: row.bike_time_ms,
                            transition2_time_ms: row.transition2_time_ms,
                            run_time_ms: row.run_time_ms,
                        };
                    })
                    .filter((r) => r.id);

                if (resultInserts.length > 0) {
                    const { error: insertError } = await supabase
                        .from("race_results")
                        .upsert(resultInserts, { onConflict: "id,event_date,race_name" });

                    if (insertError) throw insertError;
                }

                setMessage({ type: "success", text: `Successfully uploaded ${resultInserts.length} race results` });
                setFile(null);
                setPreview([]);
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
                    Upload a CSV file with race results. The file should have columns: name, team_name, city, bib_number, race_type, race_name, distance, time_ms, event_date, age_group, gender
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
                    <div className="mb-4">
                        <h3 className="mb-2 text-sm font-medium text-zinc-300">Preview (first 5 rows)</h3>
                        <div className="overflow-x-auto rounded-lg border border-zinc-700">
                            <table className="min-w-full text-sm">
                                <thead className="bg-zinc-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-zinc-400">Name</th>
                                        <th className="px-3 py-2 text-left text-zinc-400">Team</th>
                                        <th className="px-3 py-2 text-left text-zinc-400">Race</th>
                                        <th className="px-3 py-2 text-left text-zinc-400">Time (ms)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-700">
                                    {preview.map((row, i) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2 text-zinc-300">{row.name}</td>
                                            <td className="px-3 py-2 text-zinc-300">{row.team_name}</td>
                                            <td className="px-3 py-2 text-zinc-300">{row.race_name}</td>
                                            <td className="px-3 py-2 text-zinc-300">{row.time_ms}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
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

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row: ParsedRow = {};

        headers.forEach((header, index) => {
            const value = values[index];
            if (value === undefined || value === "") return;

            if (header === "time_ms" || header === "bib_number" || header === "swim_time_ms" || header === "transition1_time_ms" || header === "bike_time_ms" || header === "transition2_time_ms" || header === "run_time_ms") {
                (row as Record<string, number | string>)[header] = parseInt(value, 10);
            } else {
                (row as Record<string, number | string>)[header] = value;
            }
        });

        if (Object.keys(row).length > 0) {
            rows.push(row);
        }
    }

    return rows;
}