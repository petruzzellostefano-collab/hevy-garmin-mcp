#!/usr/bin/env node

/**
 * Fetch and dump sleep data to see exactly what Garmin returns
 */

import { getGarminClient } from "../lib/garmin/client.js";

async function run() {
    try {
        const client = await getGarminClient();
        const testDate = process.argv[2] || new Date().toISOString().split('T')[0];

        console.log(`Fetching sleep data for ${testDate}...`);

        // Use client.get() first to test the raw endpoint just in case the wrapper strips anything
        let data;
        try {
            data = await client.get(`https://connectapi.garmin.com/sleep-service/sleep/dailySleepData?date=${testDate}`);
        } catch (e) {
            console.log("Raw endpoint failed, falling back to library method...");
            data = await client.getSleepData(testDate);
        }

        console.log("\n--- SLEEP PAYLOAD OVERVIEW ---");
        console.log(JSON.stringify(data, (key, val) => {
            // Truncate long arrays to avoid overflowing the console, we just want the schema
            if (Array.isArray(val) && val.length > 5) {
                return `[Array of ${val.length} items...]`;
            }
            return val;
        }, 2));

    } catch (err) {
        console.error("Error:", err);
    }
}

run();
