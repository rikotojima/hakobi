"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabase";

const HakobiApp = dynamic(() => import("../components/HakobiApp"), { ssr: false });
const LoginScreen = dynamic(() => import("../components/LoginScreen"), { ssr: false });

export default function Page() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <LoginScreen />;
  return <HakobiApp />;
}
