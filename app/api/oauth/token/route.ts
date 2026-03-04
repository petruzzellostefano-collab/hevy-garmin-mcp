import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const expectedSecret = process.env.MCP_AUTH_TOKEN;

    if (!expectedSecret) {
        return NextResponse.json(
            { error: "server_error", error_description: "MCP_AUTH_TOKEN environment variable is not set." },
            { status: 500 }
        );
    }

    let clientSecret = "";

    // 1. Check Basic Auth (some OAuth clients send credentials here)
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Basic ")) {
        try {
            const decoded = Buffer.from(authHeader.substring(6), "base64").toString();
            const parts = decoded.split(":");
            if (parts.length === 2) {
                clientSecret = parts[1];
            }
        } catch (e) {
            console.error("Failed to parse Basic Auth", e);
        }
    }

    // 2. Check Body (application/x-www-form-urlencoded or JSON)
    if (!clientSecret) {
        try {
            const text = await request.text();
            if (text) {
                if (text.startsWith("{")) {
                    const json = JSON.parse(text);
                    clientSecret = json.client_secret || "";
                } else {
                    const params = new URLSearchParams(text);
                    clientSecret = params.get("client_secret") || "";
                }
            }
        } catch (e) {
            console.error("Failed to parse body", e);
        }
    }

    // Verify the client secret matches our MCP_AUTH_TOKEN
    // This secures the endpoint because only someone with the actual token can get an access token
    if (clientSecret !== expectedSecret) {
        return NextResponse.json(
            { error: "invalid_client", error_description: "Invalid client_secret. Use your MCP_AUTH_TOKEN as the Client Secret in ChatGPT." },
            { status: 401 }
        );
    }

    // Return the actual MCP token as the access_token.
    // ChatGPT will pass this automatically as the Bearer token to /api/mcp.
    return NextResponse.json({
        access_token: expectedSecret,
        token_type: "Bearer",
        expires_in: 315360000, // Roughly 10 years
        refresh_token: "fake_refresh_token"
    });
}
