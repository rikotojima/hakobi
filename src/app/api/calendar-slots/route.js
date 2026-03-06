import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JST_OFFSET = 9 * 60 * 60 * 1000; // 9時間をミリ秒で

// UTC timestamp → JST の年月日時を返す
function toJST(date) {
  const jst = new Date(date.getTime() + JST_OFFSET);
  return {
    year:  jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    date:  jst.getUTCDate(),
    day:   jst.getUTCDay(),
    hour:  jst.getUTCHours(),
  };
}

// JST の年月日時からUTC Dateを作る
function fromJST(year, month, date, hour) {
  return new Date(Date.UTC(year, month - 1, date, hour, 0, 0) - JST_OFFSET);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accessToken      = searchParams.get("access_token");
  const days             = parseInt(searchParams.get("days") || "20", 10);

  if (!accessToken) {
    return NextResponse.json({ error: "access_token は必須です" }, { status: 400 });
  }

  // 今の日本時間の翌日0時（UTC）
  const nowUTC   = new Date();
  const nowJST   = toJST(nowUTC);
  const startUTC = fromJST(nowJST.year, nowJST.month, nowJST.date + 1, 0);
  const endUTC   = new Date(startUTC.getTime() + days * 2 * 24 * 60 * 60 * 1000);

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
          timeMin:  startUTC.toISOString(),
          timeMax:  endUTC.toISOString(),
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

    // 翌日から1日ずつ処理
    let workdayCount = 0;
    let cursorUTC    = new Date(startUTC);

    while (workdayCount < days) {
      const jst = toJST(cursorUTC);
      if (jst.day !== 0 && jst.day !== 6) {
        for (const hour of WORK_HOURS) {
          // このスロットのUTC開始・終了
          const slotStartUTC = fromJST(jst.year, jst.month, jst.date, hour);
          const slotEndUTC   = fromJST(jst.year, jst.month, jst.date, hour + 1);

          const isBusy = busySlots.some(b => {
            const bs = new Date(b.start);
            const be = new Date(b.end);
            return slotStartUTC < be && slotEndUTC > bs;
          });

          const dateKey = `${jst.month}/${jst.date}(${DAY_NAMES[jst.day]})`;
          const timeKey = `${String(hour).padStart(2, "0")}:00`;
          const key     = `${dateKey}-${timeKey}`;

          if (isBusy) {
            busyKeys.push(key);
          } else {
            availableSlots.push({ start: slotStartUTC.toISOString(), end: slotEndUTC.toISOString(), dateKey, timeKey, key });
          }
        }
        workdayCount++;
      }
      cursorUTC.setUTCDate(cursorUTC.getUTCDate() + 1);
    }

    console.log("Busy keys:", busyKeys);
    return NextResponse.json({ slots: availableSlots, busyKeys });
  } catch (err) {
    console.error("calendar-slots error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
