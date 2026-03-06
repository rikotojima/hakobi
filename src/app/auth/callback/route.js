import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// 許可する社内ドメイン（カンマ区切りで複数指定可）
const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS || "").split(",").map(d => d.trim()).filter(Boolean);

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  // 社内ドメイン制限チェック
  if (ALLOWED_DOMAINS.length > 0) {
    const email = data.session?.user?.email || "";
    const isAllowed = ALLOWED_DOMAINS.some(domain => email.endsWith(`@${domain}`));
    if (!isAllowed) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/?error=unauthorized_domain`);
    }
  }

  return NextResponse.redirect(origin);
}
