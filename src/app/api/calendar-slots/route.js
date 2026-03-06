import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // キャッシュ無効化

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accessToken      = searchParams.get("access_token");
  const days             = parseInt(searchParams.get("days") || "20", 10);

  if (!accessToken) {
    return NextResponse.json({ error: "access_token は必須です" }, { status: 400 });
  }

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() + 1);
  timeMin.setHours(0, 0, 0, 0);

  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + days * 2);

  try {
    const freeBusyRes = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        cache: "no-store", // Googleへのリクエストもキャッシュ無効化
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

    console.log("Busy slots from Google:", JSON.stringify(busySlots));

    const WORK_HOURS = [9, 10, 11, 13, 14, 15, 16, 17];
    const DAY_NAMES  = ["日","月","火","水","木","金","土"];
    const availableSlots = [];
    const busyKeys       = [];

    const cursor = new Date(timeMin);
    let workdayCount = 0;

    while (workdayCount < days) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) {
        for (const hour of WORK_HOURS) {
          const slotStart = new Date(cursor);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          const isBusy = busySlots.some(b => {
            const bs = new Date(b.start);
            const be = new Date(b.end);
            return slotStart < be && slotEnd > bs;
          });

          const dateKey = `${cursor.getMonth() + 1}/${cursor.getDate()}(${DAY_NAMES[dow]})`;
          const timeKey = `${String(hour).padStart(2, "0")}:00`;
          const key     = `${dateKey}-${timeKey}`;

          if (isBusy) {
            busyKeys.push(key);
          } else {
            availableSlots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString(), dateKey, timeKey, key });
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
