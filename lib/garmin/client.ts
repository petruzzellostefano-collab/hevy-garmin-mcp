import { GarminConnect } from "@flow-js/garmin-connect";
import { put, list } from "@vercel/blob";
import * as fs from "fs";
import * as path from "path";

const SESSION_BLOB_NAME = "garmin-session.json";
const LOCAL_SESSION_FILE = path.join(process.cwd(), ".garmin-session.json");

const isProduction = process.env.VERCEL === "1";

let clientInstance: GarminConnect | null = null;

/**
 * Returns an authenticated GarminConnect client.
 * - In production (Vercel): persists session tokens to Vercel Blob.
 * - Locally: persists session tokens to a JSON file.
 * - Reuses client instance within the same function invocation.
 */
export async function getGarminClient(): Promise<GarminConnect> {
    if (clientInstance) return clientInstance;

    const username = process.env.GARMIN_EMAIL;
    const password = process.env.GARMIN_PASSWORD;

    if (!username || !password) {
        throw new Error(
            "GARMIN_EMAIL and GARMIN_PASSWORD environment variables are required"
        );
    }

    const client = new GarminConnect({ username, password });

    // Try to restore existing session
    const restored = await restoreSession(client);

    if (!restored) {
        // Full login required
        await client.login();
        await saveSession(client);
    }

    clientInstance = client;
    return client;
}

// --- Session Persistence ---

async function restoreSession(client: GarminConnect): Promise<boolean> {
    try {
        if (isProduction) {
            return await restoreFromBlob(client);
        } else {
            return restoreFromFile(client);
        }
    } catch {
        return false;
    }
}

async function saveSession(client: GarminConnect): Promise<void> {
    try {
        const tokens = client.exportToken();
        const data = JSON.stringify(tokens);

        if (isProduction) {
            await put(SESSION_BLOB_NAME, data, {
                access: "public",
                addRandomSuffix: false,
                contentType: "application/json",
            });
        } else {
            fs.writeFileSync(LOCAL_SESSION_FILE, data, "utf-8");
        }
    } catch (error) {
        console.warn("Failed to save Garmin session:", error);
    }
}

async function restoreFromBlob(client: GarminConnect): Promise<boolean> {
    const { blobs } = await list({ prefix: SESSION_BLOB_NAME });
    if (blobs.length === 0) return false;

    const response = await fetch(blobs[0].url);
    if (!response.ok) return false;

    const tokens = await response.json();
    client.loadToken(tokens.oauth1, tokens.oauth2);
    return true;
}

function restoreFromFile(client: GarminConnect): boolean {
    if (!fs.existsSync(LOCAL_SESSION_FILE)) return false;

    const data = fs.readFileSync(LOCAL_SESSION_FILE, "utf-8");
    const tokens = JSON.parse(data);
    client.loadToken(tokens.oauth1, tokens.oauth2);
    return true;
}
