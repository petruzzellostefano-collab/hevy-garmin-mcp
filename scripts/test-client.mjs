#!/usr/bin/env node

/**
 * Test client for the Garmin AI Coach MCP server.
 * Connects to the MCP server and calls each tool to verify data returns.
 *
 * Usage:
 *   node scripts/test-client.mjs http://localhost:3000
 *   node scripts/test-client.mjs https://your-app.vercel.app
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const baseUrl = process.argv[2] || "http://localhost:3000";
const mcpUrl = `${baseUrl}/api/mcp`;
const authToken = process.env.MCP_AUTH_TOKEN;

console.log(`\n🏃 Garmin AI Coach MCP Test Client`);
console.log(`📡 Connecting to: ${mcpUrl}\n`);

async function main() {
    const headers = {};
    if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }

    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
        requestInit: { headers },
    });

    const client = new Client({
        name: "garmin-test-client",
        version: "1.0.0",
    });

    await client.connect(transport);
    console.log("✅ Connected to MCP server\n");

    // List available tools
    const { tools } = await client.listTools();
    console.log(`📋 Available tools (${tools.length}):`);
    for (const tool of tools) {
        console.log(`   - ${tool.name}: ${tool.description?.slice(0, 80)}...`);
    }
    console.log();

    // Test each tool
    const tests = [
        {
            name: "get_recent_activities",
            args: { limit: 3, activityType: "all" },
        },
        {
            name: "get_week_summary",
            args: { date: "" },
        },
    ];

    for (const test of tests) {
        console.log(`\n🔧 Testing: ${test.name}`);
        console.log(`   Args: ${JSON.stringify(test.args)}`);
        try {
            const result = await client.callTool({
                name: test.name,
                arguments: test.args,
            });
            const text = result.content?.[0]?.text;
            if (text) {
                const data = JSON.parse(text);
                console.log(`   ✅ Success — returned ${JSON.stringify(data).length} bytes`);
                // Print a preview
                const preview = JSON.stringify(data, null, 2).slice(0, 500);
                console.log(`   Preview:\n${preview}${preview.length >= 500 ? "\n   ..." : ""}`);
            } else {
                console.log(`   ⚠️  Empty response`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    console.log("\n✅ Test complete\n");
    await client.close();
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
});
