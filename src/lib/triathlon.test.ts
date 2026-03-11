import { describe, it, expect } from "vitest";
import {
    intervalToMs,
    formatTime,
    median,
    isSantaClara,
    pad,
    swimPaceStr,
    bikePaceStr,
    runPaceStr,
    toDisplayRow,
} from "./triathlon";

describe("pad", () => {
    it("pads single digits", () => {
        expect(pad(5)).toBe("05");
    });

    it("keeps double digits", () => {
        expect(pad(12)).toBe("12");
    });
});

describe("intervalToMs", () => {
    it("parses mm:ss format", () => {
        expect(intervalToMs("15:30")).toBe(930000);
    });

    it("parses hh:mm:ss format", () => {
        expect(intervalToMs("1:15:30")).toBe(4530000);
    });

    it("parses mm:ss.ss format", () => {
        expect(intervalToMs("15:30.5")).toBe(930500);
    });

    it("returns null for empty string", () => {
        expect(intervalToMs("")).toBeNull();
    });

    it("returns null for null", () => {
        expect(intervalToMs(null)).toBeNull();
    });

    it("returns null for undefined", () => {
        expect(intervalToMs(undefined)).toBeNull();
    });

    it("returns null for invalid format", () => {
        expect(intervalToMs("invalid")).toBeNull();
    });
});

describe("formatTime", () => {
    it("formats minutes and seconds", () => {
        expect(formatTime(930000)).toBe("15:30");
    });

    it("formats hours, minutes, seconds", () => {
        expect(formatTime(4530000)).toBe("1:15:30");
    });

    it("formats zero", () => {
        expect(formatTime(0)).toBe("0:00");
    });

    it("pads seconds with zero", () => {
        expect(formatTime(65000)).toBe("1:05");
    });
});

describe("median", () => {
    it("returns median of odd count", () => {
        expect(median([1, 2, 3, 4, 5])).toBe(3);
    });

    it("returns median of even count", () => {
        expect(median([1, 2, 3, 4])).toBe(3);
    });

    it("returns 0 for empty array", () => {
        expect(median([])).toBe(0);
    });

    it("handles unsorted input", () => {
        expect(median([5, 1, 3, 2, 4])).toBe(3);
    });
});

describe("isSantaClara", () => {
    it("returns true for SANTA CLARA", () => {
        expect(isSantaClara("SANTA CLARA")).toBe(true);
    });

    it("returns true for SANTA CLARA UNIVERSITY", () => {
        expect(isSantaClara("SANTA CLARA UNIVERSITY")).toBe(true);
    });

    it("returns true for SCU", () => {
        expect(isSantaClara("SCU")).toBe(true);
    });

    it("returns true for case-insensitive", () => {
        expect(isSantaClara("Santa Clara")).toBe(true);
    });

    it("returns true for scu lowercase", () => {
        expect(isSantaClara("scu")).toBe(true);
    });

    it("returns false for null", () => {
        expect(isSantaClara(null)).toBe(false);
    });

    it("returns false for undefined", () => {
        expect(isSantaClara(undefined)).toBe(false);
    });

    it("returns false for non-SCU team", () => {
        expect(isSantaClara("Stanford")).toBe(false);
    });
});

describe("swimPaceStr", () => {
    it("calculates pace per 100m", () => {
        expect(swimPaceStr(900000, 0.4)).toBe("3:45/100m");
    });

    it("returns dash for null ms", () => {
        expect(swimPaceStr(null)).toBe("—");
    });

    it("returns dash for null km", () => {
        expect(swimPaceStr(900000, null)).toBe("—");
    });
});

describe("bikePaceStr", () => {
    it("calculates speed in km/h", () => {
        expect(bikePaceStr(3600000, 20)).toBe("20.0 km/h");
    });

    it("returns dash for null ms", () => {
        expect(bikePaceStr(null)).toBe("—");
    });
});

describe("runPaceStr", () => {
    it("calculates pace per km", () => {
        expect(runPaceStr(1800000, 5)).toBe("6:00/km");
    });

    it("returns dash for null ms", () => {
        expect(runPaceStr(null)).toBe("—");
    });
});

describe("toDisplayRow", () => {
    const mockRawResult = {
        result_id: 1,
        athlete_bib: 123,
        athlete_age: 20,
        athlete_division: "Collegiate",
        time_swim: "15:30",
        time_t1: "01:00",
        time_bike: "30:00",
        time_t2: "00:45",
        time_run: "20:00",
        time_chip: "1:07:15",
        athletes: {
            id: 1,
            name: "John Doe",
            team: "SCU",
            city: "Santa Clara",
            gender: "M",
        },
        races: {
            id: 1,
            race_name: "Test Race",
            race_date: "2025-01-01",
            race_type: "Sprint",
            race_location: "Santa Clara",
            meters_swim: 750,
            meters_bike: 20000,
            meters_run: 5000,
        },
    };

    it("converts valid RawResult to DisplayRow", () => {
        const result = toDisplayRow(mockRawResult as any);
        expect(result).not.toBeNull();
        expect(result?.bib).toBe(123);
        expect(result?.name).toBe("John Doe");
        expect(result?.team).toBe("SCU");
        expect(result?.division).toBe("Collegiate");
    });

    it("calculates age_group for male 20", () => {
        const result = toDisplayRow(mockRawResult as any);
        expect(result?.age_group).toBe("M20-24");
    });

    it("returns null for null time_chip", () => {
        const result = toDisplayRow({ ...mockRawResult, time_chip: null } as any);
        expect(result).toBeNull();
    });

    it("converts race distances to km", () => {
        const result = toDisplayRow(mockRawResult as any);
        expect(result?.race_swim_km).toBe(0.75);
        expect(result?.race_bike_km).toBe(20);
        expect(result?.race_run_km).toBe(5);
    });
});