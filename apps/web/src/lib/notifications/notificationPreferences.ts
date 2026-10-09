import supportedTimezones from './timezones.json';

export type NotificationPreferences = {
  instant_enabled: boolean;
  daily_pulse_enabled: boolean;
  weekly_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string | null;
};

export type NotificationCadence = 'instant_enabled' | 'daily_pulse_enabled' | 'weekly_enabled';
export const notificationPreferenceColumns =
  'instant_enabled,daily_pulse_enabled,weekly_enabled,quiet_hours_start,quiet_hours_end,timezone';

// These are the existing database/dispatcher defaults, not a new opt-in write.
export const defaultNotificationPreferences: Readonly<NotificationPreferences> = Object.freeze({
  instant_enabled: true, daily_pulse_enabled: true, weekly_enabled: true,
  quiet_hours_start: null, quiet_hours_end: null, timezone: null,
});

export function parseNotificationPreferences(value: unknown): NotificationPreferences {
  if (value === null) return {...defaultNotificationPreferences};
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Notification settings are unavailable.');
  const row = value as Record<string, unknown>;
  for (const field of ['instant_enabled', 'daily_pulse_enabled', 'weekly_enabled']) {
    if (typeof row[field] !== 'boolean') throw new Error('Notification settings are incomplete.');
  }
  for (const field of ['quiet_hours_start', 'quiet_hours_end', 'timezone']) {
    if (row[field] !== null && typeof row[field] !== 'string') throw new Error('Notification settings are incomplete.');
  }
  return Object.fromEntries(notificationPreferenceColumns.split(',').map(field => [field, row[field]])) as NotificationPreferences;
}

export function notificationQuietHoursPatch(start: string, end: string, timezone: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) {
    throw new Error('Choose a start and end time.');
  }
  if (start === end) throw new Error('Choose different start and end times.');
  const zone = timezone.trim();
  if (!zone) throw new Error('Choose a timezone.');
  if (!supportedTimezones.includes(zone)) throw new Error('Choose a supported timezone from the list.');
  try { new Intl.DateTimeFormat('en-US', {timeZone: zone}).format(); }
  catch { throw new Error('Choose a supported timezone.'); }
  return {quiet_hours_start: start + ':00', quiet_hours_end: end + ':00', timezone: zone};
}

export function notificationTimeInput(value: string | null): string {
  if (value?.startsWith('24:00:00')) return '00:00';
  return value?.slice(0, 5) ?? '';
}

export function notificationQuietHoursIssue(value: NotificationPreferences): string | null {
  if (value.quiet_hours_start === null && value.quiet_hours_end === null) return null;
  if (value.quiet_hours_start === null || value.quiet_hours_end === null) return 'Saved quiet hours are incomplete, so they do not pause updates. Choose a start and end time to enable them.';
  if (notificationTimeInput(value.quiet_hours_start) === notificationTimeInput(value.quiet_hours_end)) return 'Saved quiet hours have the same start and end, so they are off. Choose different times to enable them.';
  if (value.timezone && !supportedTimezones.includes(value.timezone)) return 'Your saved timezone needs review. Choose a timezone from the list before saving quiet hours. An unavailable saved timezone uses UTC.';
  return null;
}

