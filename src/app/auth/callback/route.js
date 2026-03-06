import { NextResponse } from "next/server";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    console.log("No code found, params:", requestUrl.searchParams.toString());
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  return NextResponse.redirect(`${origin}/?code=${code}`);
}
