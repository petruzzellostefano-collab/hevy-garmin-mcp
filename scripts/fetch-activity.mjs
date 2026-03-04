#!/usr/bin/env node

/**
 * Quick one-off: fetch a single activity detail and print lap splits.
 * Usage: node scripts/fetch-activity.mjs <baseUrl> <activityId>
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const baseUrl = process.argv[2] || "http://localhost:3000";
const activityId = parseInt(process.argv[3]);
const mcpUrl = `${baseUrl}/api/mcp`;

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {});
const client = new Client({ name: "fetch-activity", version: "1.0.0" });
await client.connect(transport);

const result = await client.callTool({
    name: "get_activity_detail",
    arguments: { activityId },
});

const data = JSON.parse(result.content?.[0]?.text);

// Print activity summary
const s = data.activity?.summaryDTO || data.activity;
console.log(`\n📍 ${data.activity?.activityName || "Activity"}`);
console.log(`   Date: ${s.startTimeLocal}`);
console.log(`   Distance: ${(s.distance / 1000).toFixed(2)} km`);
console.log(`   Duration: ${Math.floor(s.duration / 60)}:${String(Math.floor(s.duration % 60)).padStart(2, "0")}`);
console.log(`   Avg HR: ${s.averageHR} | Max HR: ${s.maxHR}`);

// Print laps
const laps = data.splits?.lapDTOs || [];
console.log(`\n🏃 ${laps.length} Laps:\n`);
console.log("Lap  | Distance  | Duration | Pace (m/s) | Avg HR | Max HR | Cadence | Type");
console.log("-----|-----------|----------|------------|--------|--------|---------|--------");

for (const lap of laps) {
    const mins = Math.floor(lap.duration / 60);
    const secs = Math.floor(lap.duration % 60);
    const dur = `${mins}:${String(secs).padStart(2, "0")}`;
    const dist = `${lap.distance.toFixed(0)}m`.padEnd(7);
    const type = lap.intensityType || "-";

    console.log(
        `${String(lap.lapIndex).padStart(3)}  | ${dist}   | ${dur.padEnd(8)} | ${(lap.averageSpeed || 0).toFixed(3).padStart(10)} | ${String(lap.averageHR || "-").padStart(6)} | ${String(lap.maxHR || "-").padStart(6)} | ${String(lap.averageRunCadence?.toFixed(0) || "-").padStart(7)} | ${type}`
    );
}

await client.close();
process.exit(0);
