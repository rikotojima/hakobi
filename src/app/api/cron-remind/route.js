// ファイルの置き場所: src/app/api/cron-remind/route.js
// ※ このファイルで既存の route.js をまるごと上書きしてください

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function GET(request) {
  // ── セキュリティチェック ─────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || "https://hakobi.vercel.app";

  if (!webhookUrl) {
    return NextResponse.json({ error: "SLACK_WEBHOOK_URL が設定されていません" }, { status: 500 });
  }

  try {
    // ── データ取得 ────────────────────────────────────────────────────────
    const { data: candidates, error } = await supabase
      .from("candidates")
      .select("*");

    if (error) throw new Error(error.message);

    // ── ① 書類選考が保留中の候補者 ────────────────────────────────────────
    const pendingScreening = (candidates || []).filter(
      (c) => c.stage === "書類選考"
    );

    // ── ② 面接が完了しているが評価（コメント）が未入力の候補者 ──────────────
    const pendingEvaluation = (candidates || []).filter((c) => {
      if (!c.timeline || !Array.isArray(c.timeline)) return false;
      return c.timeline.some(
        (t) =>
          t.stage !== "書類選考" &&
          t.stage !== "内定" &&
          t.status === "done" &&
          (!t.comments || t.comments.length === 0)
      );
    });

    // どちらも0件なら通知不要
    if (pendingScreening.length === 0 && pendingEvaluation.length === 0) {
      console.log("通知対象なし");
      return NextResponse.json({ ok: true, message: "通知対象なし" });
    }

    // ── メッセージ作成 ────────────────────────────────────────────────────
    const today = new Date().toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let message = `🔔 *hakobi 毎朝レポート — ${today}*\n\n`;

    if (pendingScreening.length > 0) {
      message += `📋 *書類選考が保留中の候補者（${pendingScreening.length}名）*\n`;
      pendingScreening.forEach((c) => {
        const link = `${appUrl}/?candidate=${encodeURIComponent(c.name)}`;
        message += `　• ${c.name}（${c.position}）　<${link}|hakobi で確認>\n`;
      });
      message += "\n";
    }

    if (pendingEvaluation.length > 0) {
      message += `💬 *面接完了・評価未入力の候補者（${pendingEvaluation.length}名）*\n`;
      pendingEvaluation.forEach((c) => {
        const pendingStages = c.timeline
          .filter(
            (t) =>
              t.stage !== "書類選考" &&
              t.stage !== "内定" &&
              t.status === "done" &&
              (!t.comments || t.comments.length === 0)
          )
          .map((t) => t.stage)
          .join("、");
        const link = `${appUrl}/?candidate=${encodeURIComponent(c.name)}`;
        message += `　• ${c.name}（${c.position}）— ${pendingStages}　<${link}|hakobi で確認>\n`;
      });
    }

    // ── Slack 送信 ────────────────────────────────────────────────────────
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Slack webhook error:", text);
      return NextResponse.json({ error: "Slack送信に失敗しました", detail: text }, { status: 500 });
    }

    console.log(`Cron 完了: 書類選考保留=${pendingScreening.length}, 評価未入力=${pendingEvaluation.length}`);
    return NextResponse.json({
      ok: true,
      pendingScreening: pendingScreening.length,
      pendingEvaluation: pendingEvaluation.length,
    });

  } catch (err) {
    console.error("cron-remind error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
