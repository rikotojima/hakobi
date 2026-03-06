"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import HakobiApp from "../components/HakobiApp";

const FONT      = "'Syne', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";

const ERROR_MESSAGES = {
  unauthorized_domain: "このアカウントはアクセス権限がありません。社内メールアドレスでログインしてください。",
  auth_failed:         "ログインに失敗しました。もう一度お試しください。",
  no_code:             "認証コードが取得できませんでした。",
};

export default function Page() {
  const [session, setSession]   = useState(undefined); // undefined=loading
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // URLのエラークエリを読む
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err    = params.get("error");
    if (err && ERROR_MESSAGES[err]) {
      setErrorMsg(ERROR_MESSAGES[err]);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // セッション監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/calendar.readonly",
        queryParams: {
          access_type: "offline",
          prompt:      "consent",
        },
      },
    });
    if (error) { setErrorMsg(error.message); setLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6fa" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;600&display=swap');`}</style>
        <div style={{ fontFamily: FONT_BODY, color: "#7b80a0", fontSize: 13 }}>読み込み中...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f6fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
        <div style={{
          background: "#fff", borderRadius: 20, padding: "48px 44px", width: 400, maxWidth: "92vw",
          boxShadow: "0 8px 40px rgba(0,0,0,0.10)", border: "1px solid #e2e5f0", textAlign: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 32 }}>
            <svg width="46" height="28" viewBox="0 0 46 28" fill="none">
              <rect width="46" height="28" rx="9" fill="url(#lg)"/>
              <path d="M7 16 C11.5 16 11.5 11 17 11 C22.5 11 22.5 17 28 17 C33.5 17 33.5 12 38 12"
                stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
              <circle cx="38.5" cy="12" r="2.4" fill="white"/>
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="46" y2="28" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2563eb"/>
                  <stop offset="100%" stopColor="#6d28d9"/>
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, color: "#1a1d2e", letterSpacing: "-0.02em" }}>hakobi</span>
          </div>

          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: "#1a1d2e", marginBottom: 8 }}>
            社内メンバーでログイン
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#7b80a0", marginBottom: 32, lineHeight: 1.6 }}>
            会社のGoogleアカウントでログインしてください。
          </div>

          {errorMsg && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
              padding: "11px 14px", marginBottom: 20, fontSize: 13, color: "#dc2626",
              fontFamily: FONT_BODY, lineHeight: 1.5, textAlign: "left",
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%", padding: "13px 0",
              background: loading ? "#e2e5f0" : "#fff",
              border: "1.5px solid #e2e5f0", borderRadius: 12, cursor: loading ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontFamily: FONT_BODY, fontWeight: 600, fontSize: 15, color: "#1a1d2e",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "all 0.15s",
            }}
          >
            {!loading && (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.3 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.2 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.7-3.4-11.3-8l-6.6 5.1C9.6 39.5 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.2 5.2C40.8 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
              </svg>
            )}
            {loading ? "リダイレクト中..." : "Googleでログイン"}
          </button>

          <div style={{ marginTop: 20, fontSize: 11, color: "#7b80a0", fontFamily: FONT_BODY }}>
            社内メンバー限定 • 許可されたドメインのみアクセス可能
          </div>
        </div>
      </div>
    );
  }

  return <HakobiApp session={session} onLogout={handleLogout} />;
}
