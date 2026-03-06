import { NextResponse } from "next/server";

export async function POST(request) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json({ error: "SLACK_WEBHOOK_URL が設定されていません" }, { status: 500 });
  }

  try {
    const { message, channel } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "message は必須です" }, { status: 400 });
    }

    const payload = {
      text: message,
      ...(channel && { channel }),
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Slack webhook error:", text);
      return NextResponse.json({ error: "Slack送信に失敗しました", detail: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Slack notify error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
