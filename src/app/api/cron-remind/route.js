// ファイルの置き場所: src/app/api/cron-remind/route.js
// ※ このファイルで既存の route.js をまるごと上書きしてください

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// リマインダーのテキスト（例: "面接日程が確定しました（3/9(月) 09:00）"）から
// 日時を取り出し、現在より過去かどうかを判定する
function isReminderDateInPast(text) {
  if (!text) return false;
  const match = text.match(/[（(](\d+)\/(\d+)[^\s]*\s+(\d+):(\d+)[）)]/);
  if (!match) return false;
  const [, month, day, hour, minute] = match;
  const now = new Date();
  const date = new Date(
    now.getFullYear(),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
  );
  // 年をまたぐ場合（例: 1月に12月の日付を参照）は前年とみなす
  if (date.getTime() - now.getTime() > 180 * 24 * 60 * 60 * 1000) {
    date.setFullYear(date.getFullYear() - 1);
  }
  return date < now;
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
    // ── データ取得 ────────────────────────────────────────────────────────
    const [
      { data: candidates, error: cErr },
      { data: reminders,  error: rErr },
      { data: interviewers, error: iErr },
    ] = await Promise.all([
      supabase.from("candidates").select("*"),
      supabase.from("reminders").select("*"),
      supabase.from("interviewers").select("*"),
    ]);

    if (cErr) throw new Error(cErr.message);
    if (rErr) throw new Error(rErr.message);
    if (iErr) throw new Error(iErr.message);

    // 面接官名 → slack_handle のマップ
    const ivByName = Object.fromEntries(
      (interviewers || []).map((iv) => [iv.name, iv.slack_handle])
    );

    // slack_handle をメンション形式に変換
    const toMention = (handle) => {
      if (!handle) return null;
      return `<@${handle.replace(/^@/, "")}>`;
    };

    // ── ① 書類選考が保留中の候補者 ─────────────────────────────────────
    const pendingScreening = (candidates || []).filter(
      (c) => c.stage === "書類選考"
    );

    // ── ② 面接が終わったのに評価がまだの通知 ──────────────────────────
    // reminders テーブルの type=interview_pending かつ interviewer が設定されていて
    // テキスト内の日時が過去のものを抽出する
    const evalReminders = (reminders || []).filter(
      (r) =>
        r.type === "interview_pending" &&
        r.interviewer &&
        isReminderDateInPast(r.text)
    );

    // 候補者ごとにまとめる { candidateName: [interviewer1, interviewer2, ...] }
    const evalByCand = {};
    evalReminders.forEach((r) => {
      if (!evalByCand[r.candidate]) evalByCand[r.candidate] = [];
      if (!evalByCand[r.candidate].includes(r.interviewer)) {
        evalByCand[r.candidate].push(r.interviewer);
      }
    });

    // どちらも0件なら通知不要
    if (pendingScreening.length === 0 && Object.keys(evalByCand).length === 0) {
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
        const ivHandle = c.screening_iv_id
          ? (interviewers || []).find((iv) => iv.id === c.screening_iv_id)?.slack_handle
          : null;
        const mention = ivHandle ? `${toMention(ivHandle)} ` : "";
        message += `　• ${mention}${c.name}（${c.position}）　<${link}|hakobi で確認>\n`;
      });
      message += "\n";
    }

    // ② 評価未入力
    if (Object.keys(evalByCand).length > 0) {
      message += `💬 *面接完了・評価コメント未入力の担当者（要対応）*\n`;
      Object.entries(evalByCand).forEach(([candName, ivNames]) => {
        const cand = (candidates || []).find((c) => c.name === candName);
        const link = `${appUrl}/?candidate=${encodeURIComponent(candName)}`;
        const mentions = ivNames
          .map((name) => toMention(ivByName[name]))
          .filter(Boolean)
          .join(" ");
        message += `　• ${mentions ? mentions + " " : ""}${candName}`;
        if (cand?.position) message += `（${cand.position}）`;
        message += `　<${link}|hakobi で評価入力>\n`;
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
      `Cron 完了: 書類選考保留=${pendingScreening.length}, 評価未入力=${Object.keys(evalByCand).length}名分`
    );
    return NextResponse.json({
      ok: true,
      pendingScreening: pendingScreening.length,
      pendingEvaluation: Object.keys(evalByCand).length,
    });

  } catch (err) {
    console.error("cron-remind error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
