// ファイルの置き場所: src/app/api/daily-slack-notify/route.js
//
// このAPIは毎朝10時（JST）にVercel Cronから自動で呼び出されます。
// ・書類選考が保留中の候補者
// ・面接が完了しているが評価（コメント）が未入力の候補者
// をSlackへ通知します。

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  // ── セキュリティチェック ─────────────────────────────────────────────────
  // Vercel Cronからのリクエストかどうかを確認する
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 環境変数チェック ─────────────────────────────────────────────────────
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookUrl || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "必要な環境変数が設定されていません" },
      { status: 500 }
    );
  }

  // ── Supabaseからデータ取得 ───────────────────────────────────────────────
  // サービスロールキーを使ってサーバー側から安全にアクセス
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("*");

  if (error) {
    console.error("Supabase fetch error:", error);
    return NextResponse.json(
      { error: "データ取得に失敗しました", detail: error.message },
      { status: 500 }
    );
  }

  // ── フィルタリング ───────────────────────────────────────────────────────

  // ①書類選考が保留中（stageが「書類選考」のままの候補者）
  const pendingScreening = candidates.filter(
    (c) => c.stage === "書類選考"
  );

  // ②面接が完了しているが評価（コメント）がまだ未入力の候補者
  // timelineを確認し、「書類選考」「内定」以外のステージが
  // status=done かつ comments が空のものがあれば対象
  const pendingEvaluation = candidates.filter((c) => {
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
    return NextResponse.json({ ok: true, message: "通知対象なし" });
  }

  // ── Slackメッセージ作成 ──────────────────────────────────────────────────
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
      message += `　• ${c.name}（${c.position}）\n`;
    });
    message += "\n";
  }

  if (pendingEvaluation.length > 0) {
    message += `💬 *面接完了・評価未入力の候補者（${pendingEvaluation.length}名）*\n`;
    pendingEvaluation.forEach((c) => {
      // どのステージの評価が未入力かも表示
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
      message += `　• ${c.name}（${c.position}）— ${pendingStages}\n`;
    });
  }

  // ── Slack送信 ────────────────────────────────────────────────────────────
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Slack webhook error:", text);
    return NextResponse.json(
      { error: "Slack送信に失敗しました", detail: text },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    pendingScreening: pendingScreening.length,
    pendingEvaluation: pendingEvaluation.length,
  });
}
