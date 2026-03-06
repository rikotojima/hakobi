"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import HakobiApp from "../components/HakobiApp";
import LoginScreen from "../components/LoginScreen";

export default function Page() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // ログイン・ログアウトの変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  // 読み込み中
  if (session === undefined) return null;

  // 未ログイン → ログイン画面
  if (!session) return <LoginScreen />;

  // ログイン済み → アプリ本体
  return <HakobiApp />;
}
