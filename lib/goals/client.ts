import { put, get } from "@vercel/blob";
import * as fs from "fs";
import * as path from "path";

const GOALS_BLOB_NAME = "athlete-goals.json";
const LOCAL_GOALS_FILE = path.join(process.cwd(), ".athlete-goals.json");

const isProduction = process.env.VERCEL === "1";

export interface Race {
    id: string;
    name: string;
    discipline: "run_5k" | "run_10k" | "half_marathon" | "marathon" | "triathlon_sprint" | "triathlon_olympic" | "triathlon_70.3" | "triathlon_full" | "other";
    date: string; // YYYY-MM-DD, can be approximate (e.g. "2026-03-15" or "2026-03")
    priority: "A" | "B" | "C"; // A = main goal, B = important tune-up, C = training race
    status: "upcoming" | "completed";
    targetNote: string; // qualitative goal, e.g. "Beat this year's time by at least 1 hour". NEVER a hardcoded number pulled from memory - always re-derive real numbers from Garmin activity history.
}

export interface AthleteInfo {
    sportsFocus: string[]; // e.g. ["running", "triathlon"]
    weeklyAvailabilityDays: number | null;
    constraints: string[]; // free text, e.g. "left knee twinge since July", "no pool access on weekends"
}

export interface AthleteGoals {
    athlete: AthleteInfo;
    races: Race[];
}

const DEFAULT_GOALS: AthleteGoals = {
    athlete: { sportsFocus: [], weeklyAvailabilityDays: null, constraints: [] },
    races: [],
};

export async function readGoals(): Promise<AthleteGoals> {
    try {
        if (isProduction) {
            const result = await get(GOALS_BLOB_NAME, { access: "private" });
            if (!result || result.statusCode !== 200 || !result.stream) return DEFAULT_GOALS;
            const reader = result.stream.getReader();
            const chunks: Uint8Array[] = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            const text = new TextDecoder().decode(Buffer.concat(chunks));
            return { ...DEFAULT_GOALS, ...JSON.parse(text) };
        } else {
            if (!fs.existsSync(LOCAL_GOALS_FILE)) return DEFAULT_GOALS;
            const text = fs.readFileSync(LOCAL_GOALS_FILE, "utf-8");
            return { ...DEFAULT_GOALS, ...JSON.parse(text) };
        }
    } catch {
        return DEFAULT_GOALS;
    }
}

export async function writeGoals(goals: AthleteGoals): Promise<void> {
    const data = JSON.stringify(goals, null, 2);
    if (isProduction) {
        await put(GOALS_BLOB_NAME, data, {
            access: "private",
            addRandomSuffix: false,
            contentType: "application/json",
        });
    } else {
        fs.writeFileSync(LOCAL_GOALS_FILE, data, "utf-8");
    }
}
