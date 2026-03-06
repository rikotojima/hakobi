import { NextResponse } from "next/server";
import { createClient }  from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || "https://hakobi.vercel.app";
  const now        = new Date();
  let processed    = 0;

  const sendSlack = async (iv, message) => {
    if (!iv?.slack_handle || !webhookUrl) return;
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `<@${iv.slack_handle}> ${message}` }),
    });
  };

  try {
    // ── 1. 面接確定済み・日時が過ぎた候補者 → コメント入力依頼 ──────────────
    const { data: confirmedCands } = await supabase
      .from("candidates")
      .select("*")
      .eq("schedule_status", "confirmed")
      .not("confirmed_at", "is", null)
      .lt("confirmed_at", now.toISOString());

    for (const cand of confirmedCands || []) {
      const ivIds = cand.confirmed_iv_ids || [];
      const { data: ivs } = await supabase.from("interviewers").select("*").in("id", ivIds.length > 0 ? ivIds : ["__none__"]);
      const link = `${appUrl}/?candidate=${encodeURIComponent(cand.name)}`;

      for (const iv of (ivs || [])) {
        await sendSlack(iv, `【コメント入力依頼】候補者: ${cand.name}　面接お疲れ様でした。選考コメントの入力をお願いします。\n🔗 hakobi で入力: ${link}`);
      }
      await supabase.from("reminders").insert({
        text: `面接が終了しました。選考コメントの入力をお願いします。`,
        type: "comment_needed", candidate: cand.name, interviewer: null,
      });
      await supabase.from("candidates").update({ schedule_status: "comment_needed", confirmed_at: null }).eq("id", cand.id);
      processed++;
    }

    // ── 2. 書類選考中の候補者 → 担当者にリマインド ──────────────────────────
    const { data: screeningCands } = await supabase
      .from("candidates")
      .select("*")
      .eq("stage", "書類選考")
      .eq("schedule_status", "awaiting_proposal")
      .not("screening_iv_id", "is", null);

    for (const cand of screeningCands || []) {
      const { data: iv } = await supabase.from("interviewers").select("*").eq("id", cand.screening_iv_id).single();
      const link = `${appUrl}/?candidate=${encodeURIComponent(cand.name)}`;

      await sendSlack(iv, `【書類選考リマインド】候補者: ${cand.name}　書類選考が保留中です。ご確認をお願いします。\n🔗 hakobi で確認: ${link}`);
      await supabase.from("reminders").insert({
        text: `書類選考が保留中です。ご確認をお願いします。`,
        type: "interviewer_check", candidate: cand.name, interviewer: iv?.name || null,
      });
      processed++;
    }

    console.log(`Cron processed: ${processed}`);
    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("cron-remind error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
