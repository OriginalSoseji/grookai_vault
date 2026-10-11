"use client";

import {useCallback, useEffect, useRef, useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {
  notificationPreferenceColumns, notificationQuietHoursPatch, notificationTimeInput, notificationQuietHoursIssue,
  parseNotificationPreferences, type NotificationCadence, type NotificationPreferences,
} from '@/lib/notifications/notificationPreferences';
import timezones from '@/lib/notifications/timezones.json';

const cadenceOptions: {field: NotificationCadence; title: string; description: string}[] = [
  {field: 'instant_enabled', title: 'Instant updates', description: 'Collection activity, matches and messages as they become available.'},
  {field: 'daily_pulse_enabled', title: 'Daily updates', description: 'Daily Pulse and match summaries when there is something to share.'},
  {field: 'weekly_enabled', title: 'Weekly updates', description: 'Weekly updates are not available yet. This saves your preference for when they are.'},
];

export function NotificationSettingsForm({ownerId}: {ownerId: string}) {
  const [value, setValue] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [start, setStart] = useState('22:00');
  const [end, setEnd] = useState('08:00');
  const [timezone, setTimezone] = useState('UTC');
  const [quietDirty, setQuietDirty] = useState(false);
  const active = useRef(false);
  const revision = useRef(0);

  const applyQuietDraft = useCallback((row: NotificationPreferences) => {
    setQuietEnabled(row.quiet_hours_start !== null && row.quiet_hours_end !== null && notificationTimeInput(row.quiet_hours_start) !== notificationTimeInput(row.quiet_hours_end));
    setStart(notificationTimeInput(row.quiet_hours_start) || '22:00');
    setEnd(notificationTimeInput(row.quiet_hours_end) || '08:00');
    setTimezone(row.timezone || 'UTC');
    setQuietDirty(false);
  }, []);

  const requireOwner = useCallback(async () => {
    const {data, error: sessionError} = await supabase.auth.getSession();
    if (sessionError || data.session?.user.id !== ownerId) throw new Error('owner_changed');
  }, [ownerId]);

  const load = useCallback(async () => {
    const request = ++revision.current;
    setBusy(true); setValue(null); setError(null); setNotice(null);
    try {
      await requireOwner();
      if (!active.current || revision.current !== request) return;
      const {data, error: readError} = await supabase.from('notification_prefs')
        .select(notificationPreferenceColumns).eq('user_id', ownerId).maybeSingle();
      if (readError) throw readError;
      await requireOwner();
      const row = parseNotificationPreferences(data);
      if (!active.current || revision.current !== request) return;
      setValue(row); applyQuietDraft(row); setNeedsReload(false);
    } catch {
      if (active.current && revision.current === request) setError('Unable to load notification settings. Try again.');
    } finally {
      if (active.current && revision.current === request) setBusy(false);
    }
  }, [ownerId, requireOwner, applyQuietDraft]);

  useEffect(() => {
    active.current = true;
    void load();
    return () => {active.current = false; revision.current += 1;};
  }, [load]);

  async function save(patch: Partial<NotificationPreferences>, quietSave = false) {
    if (busy || !value || needsReload) return;
    const request = ++revision.current;
    setBusy(true); setError(null); setNotice(null);
    try {
      await requireOwner();
      if (!active.current || revision.current !== request) return;
      const {data, error: writeError} = await supabase.from('notification_prefs')
        .upsert({user_id: ownerId, ...patch}, {onConflict: 'user_id', defaultToNull: false})
        .select(notificationPreferenceColumns).single();
      if (writeError) throw writeError;
      await requireOwner();
      const saved = parseNotificationPreferences(data);
      if (!active.current || revision.current !== request) return;
      setValue(saved);
      if (quietSave || !quietDirty) applyQuietDraft(saved);
      setNotice('Notification preferences saved.');
    } catch {
      if (!active.current || revision.current !== request) return;
      setNeedsReload(true);
      setError('Could not confirm this change. Reload settings before editing again.');
    } finally {
      if (active.current && revision.current === request) setBusy(false);
    }
  }

  function saveQuiet() {
    try {
      const patch = quietEnabled ? notificationQuietHoursPatch(start, end, timezone)
        : {quiet_hours_start: null, quiet_hours_end: null};
      void save(patch, true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Check the quiet hours you entered.');
    }
  }

  const disabled = busy || needsReload;
  const fieldClass = 'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-950 disabled:opacity-60';
  return <div className="max-w-2xl space-y-6">
    <p className="text-sm text-slate-600">Choose which collection and message updates Grookai can send to your devices.</p>
    {error && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p>{error}</p>
      {(!value || needsReload) && <button type="button" disabled={busy} onClick={() => void load()} className="mt-3 min-h-11 rounded-lg border border-amber-700 px-4 font-semibold">Reload settings</button>}
    </div>}
    {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    {busy && <p role="status" className="text-sm text-slate-600">{value ? 'Saving preferences…' : 'Loading notification settings…'}</p>}
    {value && <>
      <fieldset disabled={disabled} className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-4">
        <legend className="px-1 font-semibold text-slate-950">Updates</legend>
        {cadenceOptions.map(option => <label key={option.field} className="flex min-h-16 cursor-pointer items-center gap-4 py-4">
          <span className="min-w-0 flex-1"><span className="block font-medium text-slate-950">{option.title}</span><span className="mt-1 block text-sm text-slate-600">{option.description}</span></span>
          <input type="checkbox" checked={value[option.field]} onChange={event => void save({[option.field]: event.target.checked})} className="size-5 accent-emerald-800" />
        </label>)}
      </fieldset>
      <fieldset disabled={disabled} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 font-semibold text-slate-950">Quiet hours</legend>
        {notificationQuietHoursIssue(value) && <p role="status" className="text-sm text-amber-800">{notificationQuietHoursIssue(value)}</p>}
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={quietEnabled} onChange={event => {setQuietEnabled(event.target.checked);setQuietDirty(true);}} className="size-5 accent-emerald-800" /><span>Pause collection and message updates during quiet hours</span></label>
        {quietEnabled && <>
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1 text-sm font-medium">Start<input aria-label="Quiet hours start" type="time" value={start} onChange={event => {setStart(event.target.value);setQuietDirty(true);}} className={fieldClass} /></label>
            <label className="space-y-1 text-sm font-medium">End<input aria-label="Quiet hours end" type="time" value={end} onChange={event => {setEnd(event.target.value);setQuietDirty(true);}} className={fieldClass} /></label>
          </div>
          <label className="block space-y-1 text-sm font-medium">Timezone<input value={timezone} list="notification-timezones" onChange={event => {setTimezone(event.target.value);setQuietDirty(true);}} className={fieldClass} /><datalist id="notification-timezones">{timezones.map(zone => <option key={zone} value={zone} />)}</datalist></label>
          <p className="text-sm text-slate-600">Times follow this timezone, including daylight-saving changes. A start time later than the end continues overnight.</p>
        </>}
        <button type="button" onClick={saveQuiet} disabled={disabled || !quietDirty} className="gv-primary-button min-h-11 disabled:opacity-50">Save quiet hours</button>
      </fieldset>
      <section className="rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-950">On your phone</h2>
        <p className="mt-2 text-sm text-slate-600">Open Account → Notifications in the Grookai app to enable push notifications on that device. Saving preferences here does not grant device permission.</p>
      </section>
    </>}
  </div>;
}
