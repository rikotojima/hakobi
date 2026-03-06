import { NextResponse } from "next/server";
import { createClient }  from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // service role key（Vercel環境変数に追加が必要）
);

export async function GET(request) {
  // Vercel Cron からのリクエストのみ許可
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || "https://hakobi.vercel.app";
  const now        = new Date();

  try {
    // confirmed かつ confirmed_at が過去の候補者を取得
    const { data: candidates } = await supabase
      .from("candidates")
      .select("*")
      .eq("schedule_status", "confirmed")
      .not("confirmed_at", "is", null)
      .lt("confirmed_at", now.toISOString());

    if (!candidates?.length) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let processed = 0;

    for (const cand of candidates) {
      const ivIds = cand.confirmed_iv_ids || [];

      // 面接官を取得
      const { data: interviewers } = await supabase
        .from("interviewers")
        .select("*")
        .in("id", ivIds.length > 0 ? ivIds : ["__none__"]);

      const link = `${appUrl}/?candidate=${encodeURIComponent(cand.name)}`;

      // 面接官ごとにSlack送信 + リマインダー追加
      for (const iv of (interviewers || [])) {
        if (!iv.slack_handle) continue;
        const mention = `<@${iv.slack_handle}>`;
        const msg = `${mention} 【コメント入力依頼】候補者: ${cand.name}　面接お疲れ様でした。選考コメントの入力をお願いします。\n🔗 hakobi で入力: ${link}`;

        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg }),
          });
        }
      }

      // リマインダーをDBに追加
      await supabase.from("reminders").insert({
        text: `面接が終了しました。選考コメントの入力をお願いします。`,
        type: "comment_needed",
        candidate: cand.name,
        interviewer: null,
      });

      // ステータスを comment_needed に更新
      await supabase
        .from("candidates")
        .update({ schedule_status: "comment_needed", confirmed_at: null })
        .eq("id", cand.id);

      processed++;
      console.log(`Processed: ${cand.name}`);
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("cron-remind error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
