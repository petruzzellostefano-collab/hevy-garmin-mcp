import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const redirectUri = searchParams.get("redirect_uri");
    const state = searchParams.get("state");

    if (!redirectUri) {
        return new NextResponse("Missing redirect_uri", { status: 400 });
    }

    // Generate a placeholder authorization code
    const code = "fake_auth_code_" + Date.now();

    // Construct the redirect URL to send ChatGPT back to its own UI
    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state) {
        url.searchParams.set("state", state);
    }

    // Instantly redirect back to ChatGPT
    return NextResponse.redirect(url);
}
