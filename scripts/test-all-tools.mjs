#!/usr/bin/env node

/**
 * Full test client — calls ALL 5 Garmin MCP tools and prints complete JSON.
 *
 * Usage:
 *   node scripts/test-all-tools.mjs http://localhost:3000
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const baseUrl = process.argv[2] || "http://localhost:3000";
const mcpUrl = `${baseUrl}/api/mcp`;
const authToken = process.env.MCP_AUTH_TOKEN;

console.log(`\n🏃 Garmin AI Coach — Full Tool Test`);
console.log(`📡 Server: ${mcpUrl}\n`);

async function main() {
    const headers = {};
    if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }

    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
        requestInit: {
            headers: {
                ...headers,
                "Accept": "application/json, text/event-stream"
            }
        },
    });

    const client = new Client({
        name: "garmin-full-test",
        version: "1.0.0",
    });

    await client.connect(transport);
    console.log("✅ Connected\n");

    // Define all 5 tool calls
    const tests = [
        {
            name: "get_recent_activities",
            args: { limit: 5, activityType: "all" },
        },
        {
            name: "get_activity_detail",
            args: { activityId: null }, // will be filled from first test
        },
        {
            name: "get_planned_workout",
            args: { date: "" },
        },
        {
            name: "get_planned_vs_actual",
            args: { date: "" },
        },
        {
            name: "get_week_summary",
            args: { date: "" },
        },
        {
            name: "get_daily_recovery",
            args: { date: "" },
        },
    ];

    let firstActivityId = null;

    for (const test of tests) {
        // For get_activity_detail, use the first activity found
        if (test.name === "get_activity_detail") {
            if (!firstActivityId) {
                console.log(`\n${"═".repeat(60)}`);
                console.log(`⏭️  Skipping get_activity_detail — no activity ID found`);
                continue;
            }
            test.args.activityId = firstActivityId;
        }

        console.log(`\n${"═".repeat(60)}`);
        console.log(`🔧 ${test.name}`);
        console.log(`   Args: ${JSON.stringify(test.args)}`);
        console.log(`${"─".repeat(60)}`);

        try {
            const result = await client.callTool({
                name: test.name,
                arguments: test.args,
            });

            const text = result.content?.[0]?.text;
            if (text) {
                const data = JSON.parse(text);
                console.log(JSON.stringify(data, null, 2));

                // Capture first activity ID for detail test
                if (test.name === "get_recent_activities" && Array.isArray(data) && data.length > 0) {
                    // Find first running activity, or fall back to any
                    const running = data.find(a => a.type === "running");
                    firstActivityId = running?.activityId || data[0].activityId;
                    console.log(`\n   📌 Using activityId ${firstActivityId} for detail test`);
                }
            } else {
                console.log("   (empty response)");
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log("✅ All tools tested\n");
    await client.close();
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Fatal:", err.message);
    process.exit(1);
});
