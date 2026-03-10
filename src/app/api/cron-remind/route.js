// ファイルの置き場所: src/app/api/cron-remind/route.js
// ※ このファイルで既存の route.js をまるごと上書きしてください

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// "3/10(火) 10:00" 形式のスロットキーが現在より過去かどうかを判定
function isSlotInPast(slotKey) {
  if (!slotKey) return false;
  const match = slotKey.match(/(\d+)\/(\d+)[^\s]*\s+(\d+):(\d+)/);
  if (!match) return false;
  const [, month, day, hour, minute] = match;
  const now = new Date();
  const slotDate = new Date(
    now.getFullYear(),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
  );
  // 年をまたぐ場合（例：12月のスロットを1月に参照）は前年とみなす
  if (slotDate.getTime() - now.getTime() > 180 * 24 * 60 * 60 * 1000) {
    slotDate.setFullYear(slotDate.getFullYear() - 1);
  }
  return slotDate < now;
}

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
    // ── データ取得（候補者 + 面接官） ────────────────────────────────────
    const [{ data: candidates, error: cErr }, { data: interviewers, error: iErr }] =
      await Promise.all([
        supabase.from("candidates").select("*"),
        supabase.from("interviewers").select("*"),
      ]);

    if (cErr) throw new Error(cErr.message);
    if (iErr) throw new Error(iErr.message);

    // slack_handle → メンション文字列の変換ヘルパー
    // slack_handle が "@U012ABCDE" 形式ならそのまま、ユーザー名形式でも対応
    const toMention = (handle) => {
      if (!handle) return null;
      const clean = handle.replace(/^@/, "");
      return `<@${clean}>`;
    };

    // 面接官 id → オブジェクト のマップ
    const ivMap = Object.fromEntries((interviewers || []).map((iv) => [iv.id, iv]));

    // ── ① 書類選考が保留中の候補者 ────────────────────────────────────────
    const pendingScreening = (candidates || []).filter(
      (c) => c.stage === "書類選考"
    );

    // ── ② 面接が完了しているが評価（コメント）が未入力の候補者 ──────────────
    // 判定ルールA: timeline に status=done かつ comments 空のステージがある
    // 判定ルールB: schedule_status=confirmed かつ confirmed_slot が過去日時
    //   → 面接は終わったはずだが、まだ誰もハコビ上で処理していない状態
    const pendingEvaluation = (candidates || []).filter((c) => {
      // ルールA
      const hasUnevaluatedDoneStage =
        Array.isArray(c.timeline) &&
        c.timeline.some(
          (t) =>
            t.stage !== "書類選考" &&
            t.stage !== "内定" &&
            t.status === "done" &&
            (!t.comments || t.comments.length === 0),
        );

      // ルールB
      const isConfirmedAndPast =
        c.schedule_status === "confirmed" && isSlotInPast(c.confirmed_slot);

      return hasUnevaluatedDoneStage || isConfirmedAndPast;
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

    // ① 書類選考保留
    if (pendingScreening.length > 0) {
      message += `📋 *書類選考が保留中の候補者（${pendingScreening.length}名）*\n`;
      pendingScreening.forEach((c) => {
        const link = `${appUrl}/?candidate=${encodeURIComponent(c.name)}`;
        // screening_iv_id が設定されていればメンション
        const iv = c.screening_iv_id ? ivMap[c.screening_iv_id] : null;
        const mention = iv ? `${toMention(iv.slack_handle)} ` : "";
        message += `　• ${mention}${c.name}（${c.position}）　<${link}|hakobi で確認>\n`;
      });
      message += "\n";
    }

    // ② 評価未入力
    if (pendingEvaluation.length > 0) {
      message += `💬 *面接完了・評価未入力の候補者（${pendingEvaluation.length}名）*\n`;
      pendingEvaluation.forEach((c) => {
        const link = `${appUrl}/?candidate=${encodeURIComponent(c.name)}`;

        // どのステージが未評価かを表示
        // ルールAに該当するステージ名
        const unevaluatedStages = Array.isArray(c.timeline)
          ? c.timeline
              .filter(
                (t) =>
                  t.stage !== "書類選考" &&
                  t.stage !== "内定" &&
                  t.status === "done" &&
                  (!t.comments || t.comments.length === 0),
              )
              .map((t) => t.stage)
          : [];

        // ルールBに該当する場合は現在のステージを表示
        const stageLabel =
          unevaluatedStages.length > 0
            ? unevaluatedStages.join("、")
            : c.stage;

        // confirmed_iv_ids が設定されていれば担当面接官をメンション
        const ivIds = Array.isArray(c.confirmed_iv_ids) ? c.confirmed_iv_ids : [];
        const mentions = ivIds
          .map((id) => ivMap[id])
          .filter(Boolean)
          .map((iv) => toMention(iv.slack_handle))
          .filter(Boolean)
          .join(" ");

        message += `　• ${mentions ? mentions + " " : ""}${c.name}（${c.position}）— ${stageLabel}　<${link}|hakobi で確認>\n`;
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
      return NextResponse.json(
        { error: "Slack送信に失敗しました", detail: text },
        { status: 500 },
      );
    }

    console.log(
      `Cron 完了: 書類選考保留=${pendingScreening.length}, 評価未入力=${pendingEvaluation.length}`,
    );
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
