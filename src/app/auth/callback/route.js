import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS || "")
  .split(",").map(d => d.trim()).filter(Boolean);

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && ALLOWED_DOMAINS.length > 0) {
      const email = data.session?.user?.email || "";
      const isAllowed = ALLOWED_DOMAINS.some(d => email.endsWith(`@${d}`));
      if (!isAllowed) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/?error=unauthorized_domain`);
      }
    }
  }

  return NextResponse.redirect(origin);
}
