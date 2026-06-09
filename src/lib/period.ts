/**
 * Period calculation utilities.
 *
 * period_cut_day = 0  → calendar month (1st to last day)
 * period_cut_day = N  → each period runs from day N+1 of month M
 *                       to day N of month M+1
 *
 * Days 29–31 are clamped to the actual last day of the month when
 * the target month is shorter (e.g. Feb 30 → Feb 28).
 */

const TZ = "America/Hermosillo";

function localNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

function toDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Last day (1-based) of a given year + 1-based month. */
function lastDay(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

/** Clamp a day to the last day of the given year + 1-based month. */
function clamp(day: number, year: number, month1: number): number {
  return Math.min(day, lastDay(year, month1));
}

export interface Period {
  start: string;
  end: string;
}

export function getCurrentPeriod(cutDay: number): Period {
  const now = localNow();
  const y = now.getFullYear();
  const m1 = now.getMonth() + 1; // 1-based
  const d = now.getDate();

  if (!cutDay) {
    return {
      start: toDateStr(new Date(y, m1 - 1, 1)),
      end:   toDateStr(new Date(y, m1, 0)),
    };
  }

  if (d > cutDay) {
    // Period started on cutDay+1 of this month, ends on cutDay of next month
    const nextM1 = m1 === 12 ? 1 : m1 + 1;
    const nextY  = m1 === 12 ? y + 1 : y;
    return {
      start: toDateStr(new Date(y, m1 - 1, cutDay + 1)),
      end:   toDateStr(new Date(nextY, nextM1 - 1, clamp(cutDay, nextY, nextM1))),
    };
  } else {
    // Period started on cutDay+1 of last month, ends on cutDay of this month
    const prevM1 = m1 === 1 ? 12 : m1 - 1;
    const prevY  = m1 === 1 ? y - 1 : y;
    return {
      start: toDateStr(new Date(prevY, prevM1 - 1, cutDay + 1)),
      end:   toDateStr(new Date(y, m1 - 1, clamp(cutDay, y, m1))),
    };
  }
}

export function getPreviousPeriod(cutDay: number): Period {
  const now = localNow();
  const y = now.getFullYear();
  const m1 = now.getMonth() + 1;
  const d = now.getDate();

  if (!cutDay) {
    const prevM1 = m1 === 1 ? 12 : m1 - 1;
    const prevY  = m1 === 1 ? y - 1 : y;
    return {
      start: toDateStr(new Date(prevY, prevM1 - 1, 1)),
      end:   toDateStr(new Date(prevY, prevM1, 0)),
    };
  }

  if (d > cutDay) {
    // Previous period: cutDay+1 of last month → cutDay of this month
    const prevM1 = m1 === 1 ? 12 : m1 - 1;
    const prevY  = m1 === 1 ? y - 1 : y;
    return {
      start: toDateStr(new Date(prevY, prevM1 - 1, cutDay + 1)),
      end:   toDateStr(new Date(y, m1 - 1, clamp(cutDay, y, m1))),
    };
  } else {
    // Previous period: cutDay+1 of 2 months ago → cutDay of last month
    const prevM1  = m1 === 1 ? 12 : m1 - 1;
    const prevY   = m1 === 1 ? y - 1 : y;
    const prev2M1 = prevM1 === 1 ? 12 : prevM1 - 1;
    const prev2Y  = prevM1 === 1 ? prevY - 1 : prevY;
    return {
      start: toDateStr(new Date(prev2Y, prev2M1 - 1, cutDay + 1)),
      end:   toDateStr(new Date(prevY, prevM1 - 1, clamp(cutDay, prevY, prevM1))),
    };
  }
}

export function daysRemainingInPeriod(cutDay: number): number {
  const now = localNow();
  const { end } = getCurrentPeriod(cutDay);
  const [ey, em, ed] = end.split("-").map(Number);
  const endDate = new Date(ey, em - 1, ed);
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((endDate.getTime() - todayMid.getTime()) / 86_400_000);
  return Math.max(1, diff + 1); // include today
}
