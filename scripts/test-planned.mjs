#!/usr/bin/env node

/**
 * Test get_planned_workout and get_planned_vs_actual for a specific date.
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const baseUrl = process.argv[2] || "http://localhost:3000";
const testDate = process.argv[3] || "2026-02-26";
const mcpUrl = `${baseUrl}/api/mcp`;

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {});
const client = new Client({ name: "test-planned", version: "1.0.0" });
await client.connect(transport);

console.log(`\n📅 Testing planned workout tools for date: ${testDate}\n`);

// Tool 3: get_planned_workout
console.log("═".repeat(60));
console.log("🔧 get_planned_workout");
console.log("─".repeat(60));
const planned = await client.callTool({
    name: "get_planned_workout",
    arguments: { date: testDate },
});
console.log(planned.content?.[0]?.text);

// Tool 4: get_planned_vs_actual
console.log("\n" + "═".repeat(60));
console.log("🔧 get_planned_vs_actual");
console.log("─".repeat(60));
const vsActual = await client.callTool({
    name: "get_planned_vs_actual",
    arguments: { date: testDate },
});
console.log(vsActual.content?.[0]?.text);

await client.close();
process.exit(0);
