export type NotificationQuietHours = {
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string | null;
};

function timeMinutes(value: string | null): number | null {
  // PostgreSQL time also permits the exact end-of-day spelling 24:00:00.
  if (value && /^24:00(?::00(?:\.0+)?)?$/.test(value)) return 0;
  const match = value?.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0);
  return hour < 24 && minute < 60 && second < 60 ? hour * 60 + minute : null;
}

function localClock(timezone: string | null): (date: Date) => number {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC', hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    // Retain the dispatcher's established UTC fallback for old invalid settings.
    return date => date.getUTCHours() * 60 + date.getUTCMinutes();
  }
  return date => {
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find(part => part.type === 'hour')!.value) % 24;
    const minute = Number(parts.find(part => part.type === 'minute')!.value);
    return hour * 60 + minute;
  };
}

function quietPredicate(prefs: NotificationQuietHours): (date: Date) => boolean {
  const start = timeMinutes(prefs.quiet_hours_start);
  const end = timeMinutes(prefs.quiet_hours_end);
  if (start === null || end === null || start === end) return () => false;
  const clock = localClock(prefs.timezone);
  return date => {
    const minute = clock(date);
    return start < end ? minute >= start && minute < end : minute >= start || minute < end;
  };
}

export function isInsideQuietHours(now: Date, prefs: NotificationQuietHours): boolean {
  return quietPredicate(prefs)(now);
}

export function nextQuietEnd(now: Date, prefs: NotificationQuietHours): Date {
  const quiet = quietPredicate(prefs);
  if (!quiet(now)) return new Date(now.getTime());
  // Advance along actual instants, not local-clock arithmetic: DST can repeat or
  // omit an hour (or half an hour). Reuse one formatter for this bounded search.
  let instant = Math.floor(now.getTime() / 60_000) * 60_000 + 60_000;
  for (let minute = 0; minute < 48 * 60; minute++, instant += 60_000) {
    const candidate = new Date(instant);
    if (!quiet(candidate)) return candidate;
  }
  throw new Error('Unable to resolve the end of notification quiet hours');
}
