import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accessToken      = searchParams.get("access_token");
  const days             = parseInt(searchParams.get("days") || "20", 10);

  if (!accessToken) {
    return NextResponse.json({ error: "access_token は必須です" }, { status: 400 });
  }

  // 日本時間で tomorrow 〜 days*2日後
  const nowJST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const timeMin = new Date(nowJST);
  timeMin.setDate(timeMin.getDate() + 1);
  timeMin.setHours(0, 0, 0, 0);

  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + days * 2);

  try {
    const freeBusyRes = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        cache: "no-store",
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

    const freeBusy  = await freeBusyRes.json();
    const busySlots = freeBusy.calendars?.primary?.busy || [];

    const WORK_HOURS = [9, 10, 11, 13, 14, 15, 16, 17];
    const DAY_NAMES  = ["日","月","火","水","木","金","土"];
    const availableSlots = [];
    const busyKeys       = [];

    const cursor = new Date(timeMin);
    let workdayCount = 0;

    while (workdayCount < days) {
      // cursorを日本時間として解釈
      const jstStr = cursor.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
      const jst    = new Date(jstStr);
      const dow    = jst.getDay();

      if (dow !== 0 && dow !== 6) {
        for (const hour of WORK_HOURS) {
          // 日本時間でスロット開始・終了を作成
          const slotStartJST = new Date(cursor);
          slotStartJST.setHours(hour, 0, 0, 0);
          const slotEndJST = new Date(slotStartJST);
          slotEndJST.setHours(hour + 1, 0, 0, 0);

          // busySlots の時刻と比較（両方 Date オブジェクトとして比較）
          const isBusy = busySlots.some(b => {
            const bs = new Date(b.start);
            const be = new Date(b.end);
            return slotStartJST < be && slotEndJST > bs;
          });

          const month   = cursor.getMonth() + 1;
          const date    = cursor.getDate();
          const dateKey = `${month}/${date}(${DAY_NAMES[dow]})`;
          const timeKey = `${String(hour).padStart(2, "0")}:00`;
          const key     = `${dateKey}-${timeKey}`;

          if (isBusy) {
            busyKeys.push(key);
          } else {
            availableSlots.push({ start: slotStartJST.toISOString(), end: slotEndJST.toISOString(), dateKey, timeKey, key });
          }
        }
        workdayCount++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    console.log("Busy keys:", busyKeys);
    return NextResponse.json({ slots: availableSlots, busyKeys });
  } catch (err) {
    console.error("calendar-slots error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
