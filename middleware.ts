import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    // Only protect the MCP API routes
    if (request.nextUrl.pathname.startsWith("/api")) {
        const authHeader = request.headers.get("Authorization");
        const tokenQuery = request.nextUrl.searchParams.get("token");
        const expectedToken = process.env.MCP_AUTH_TOKEN;

        if (!expectedToken) {
            console.warn("MCP_AUTH_TOKEN not set — auth disabled");
            return NextResponse.next();
        }

        const isAuthorized = authHeader === `Bearer ${expectedToken}` || tokenQuery === expectedToken;

        if (!isAuthorized) {
            return new NextResponse("Unauthorized", { status: 401 });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: "/api/:path*",
};
