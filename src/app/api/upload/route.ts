import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function parseInterval(timeStr: string): string | null {
    if (!timeStr) return null;
    const parts = timeStr.trim().split(":");
    if (parts.length === 2) {
        const [m, s] = parts;
        return `${m.padStart(2, "0")}:${s.padStart(2, "0")}:00`;
    }
    if (parts.length === 3) {
        const [h, m, s] = parts;
        return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`;
    }
    return null;
}

function parseCSVWithMapping(text: string, mapping: Record<string, string>) {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

    const getField = (dbField: string) => {
        const colIdx = headers.findIndex(
            (h) => h.toLowerCase() === mapping[dbField]?.toLowerCase()
        );
        return colIdx >= 0 ? lines.slice(1).map((line) => {
            const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
            return cols[colIdx] || "";
        }) : [];
    };

    const bibly = getField("bib");
    const nameField = getField("name");
    const teamField = getField("team");
    const cityField = getField("city");
    const genderField = getField("gender");
    const ageField = getField("age");
    const divisionField = getField("division");
    const swimField = getField("time_swim");
    const t1Field = getField("time_t1");
    const bikeField = getField("time_bike");
    const t2Field = getField("time_t2");
    const runField = getField("time_run");
    const chipField = getField("time_chip");

    return nameField.map((_, i) => ({
        bib: parseInt(bibly[i]) || 0,
        name: nameField[i] || "",
        team: teamField[i] || "",
        city: cityField[i] || "",
        gender: genderField[i] || "",
        age: parseInt(ageField[i]) || null,
        division: divisionField[i] || "Collegiate",
        time_swim: parseInterval(swimField[i]),
        time_t1: parseInterval(t1Field[i]),
        time_bike: parseInterval(bikeField[i]),
        time_t2: parseInterval(t2Field[i]),
        time_run: parseInterval(runField[i]),
        time_chip: parseInterval(chipField[i]),
    }));
}

export async function POST(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json(
            { error: "Server misconfigured" },
            { status: 500 }
        );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
        const body = await request.json();
        const { raceInfo, mapping, csvData } = body;

        if (!raceInfo?.race_name || !csvData) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const rows = parseCSVWithMapping(csvData, mapping);

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
        const uniqueAthleteKeys = [...new Set(rows.map((row) => `${row.name.toLowerCase()}-${(row.team || "").toLowerCase()}`))];

        if (uniqueAthleteKeys.length > 0) {
            const { data: existingAthletes } = await supabase
                .from("athletes")
                .select("id, name, team")
                .in("name", uniqueAthleteKeys.map((k) => k.split("-")[0]));

            if (existingAthletes) {
                for (const athlete of existingAthletes) {
                    const athleteKey = `${athlete.name.toLowerCase()}-${(athlete.team || "").toLowerCase()}`;
                    athleteMap.set(athleteKey, athlete.id);
                }
            }

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
                }
            }

            const uniqueInserts = athleteInserts.filter(
                (v, i, a) => a.findIndex((t) => t.name === v.name && t.team === v.team) === i
            );

            if (uniqueInserts.length > 0) {
                const { data: newAthletes, error: athleteError } = await supabase
                    .from("athletes")
                    .insert(uniqueInserts)
                    .select();

                if (athleteError) throw athleteError;

                if (newAthletes) {
                    for (const athlete of newAthletes) {
                        const athleteKey = `${athlete.name.toLowerCase()}-${(athlete.team || "").toLowerCase()}`;
                        athleteMap.set(athleteKey, athlete.id);
                    }
                }
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
                    time_swim: row.time_swim,
                    time_t1: row.time_t1,
                    time_bike: row.time_bike,
                    time_t2: row.time_t2,
                    time_run: row.time_run,
                    time_chip: row.time_chip,
                };
            })
            .filter((r) => r.athlete_id);

        if (resultInserts.length > 0) {
            const { error: insertError } = await supabase
                .from("results")
                .insert(resultInserts);

            if (insertError) throw insertError;
        }

        return NextResponse.json({
            success: true,
            message: `Successfully uploaded ${resultInserts.length} results`,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 }
        );
    }
}