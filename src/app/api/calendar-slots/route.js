import { NextResponse } from "next/server";

/**
 * GET /api/calendar-slots?access_token=xxx&days=5
 *
 * Google Calendar の freebusy API を使って、
 * 指定日数分の「空き枠」を返す。
 *
 * フロントから呼ぶ際は Supabase セッションの
 * provider_token（Googleアクセストークン）を渡す。
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accessToken      = searchParams.get("access_token");
  const days             = parseInt(searchParams.get("days") || "5", 10);

  if (!accessToken) {
    return NextResponse.json({ error: "access_token は必須です" }, { status: 400 });
  }

  // 対象期間: 明日〜5営業日
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() + 1);
  timeMin.setHours(0, 0, 0, 0);

  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + days * 2); // 週末を含む余裕を持たせる

  try {
    // 1) カレンダー一覧を取得（primary を使う）
    const freeBusyRes = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin:  timeMin.toISOString(),
          timeMax:  timeMax.toISOString(),
          timeZone: "Asia/Tokyo",
          items:    [{ id: "primary" }],
        }),
      }
    );

    if (!freeBusyRes.ok) {
      const err = await freeBusyRes.json();
      return NextResponse.json({ error: "Google Calendar API エラー", detail: err }, { status: freeBusyRes.status });
    }

    const freeBusy = await freeBusyRes.json();
    const busySlots = freeBusy.calendars?.primary?.busy || [];

    // 2) 候補時間帯: 09:00〜18:00 の1時間枠、平日のみ
    const WORK_HOURS = [9, 10, 11, 13, 14, 15, 16, 17];
    const availableSlots = [];

    const cursor = new Date(timeMin);
    let workdayCount = 0;

    while (workdayCount < days) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) { // 平日
        for (const hour of WORK_HOURS) {
          const slotStart = new Date(cursor);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          // busy と重なっていないか確認
          const isBusy = busySlots.some(b => {
            const bs = new Date(b.start);
            const be = new Date(b.end);
            return slotStart < be && slotEnd > bs;
          });

          if (!isBusy) {
            availableSlots.push({
              start:     slotStart.toISOString(),
              end:       slotEnd.toISOString(),
              label:     `${cursor.getMonth() + 1}/${cursor.getDate()}(${["日","月","火","水","木","金","土"][dow]}) ${String(hour).padStart(2,"0")}:00`,
              dateKey:   `${cursor.getMonth() + 1}/${cursor.getDate()}(${["日","月","火","水","木","金","土"][dow]})`,
              timeKey:   `${String(hour).padStart(2,"0")}:00`,
            });
          }
        }
        workdayCount++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({ slots: availableSlots });
  } catch (err) {
    console.error("calendar-slots error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
