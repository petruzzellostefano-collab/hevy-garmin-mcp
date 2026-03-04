const url = "https://garmin-ai-coach-ashy.vercel.app/api/mcp";

async function test() {
    console.log("Testing POST to", url);
    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "callTool",
            params: {
                name: "get_recent_activities",
                arguments: { limit: 1 }
            }
        })
    });

    console.log("Status:", resp.status);
    console.log("Headers:", Object.fromEntries(resp.headers.entries()));
    const text = await resp.text();
    console.log("Body:", text);
}

test().catch(console.error);
