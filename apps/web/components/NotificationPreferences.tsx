'use client';

import { useState, useEffect } from 'react';
import { getNotificationPreferences, updateNotificationPreference } from '../lib/api';

const notificationTypes = [
  { type: 'drawdown_alert', label: 'Drawdown Alerts', description: 'Get notified when your drawdown exceeds thresholds' },
  { type: 'fomo_warning', label: 'FOMO Warnings', description: 'Alerts when emotional trading indicators are high' },
  { type: 'coaching', label: 'Coaching Alerts', description: 'Losing streak and performance pattern alerts' },
  { type: 'journal_reminder', label: 'Journal Reminders', description: 'Reminders to log your trading reflections' },
  { type: 'discipline_reminder', label: 'Discipline Reminders', description: 'Alerts to stay disciplined with your trading plan' },
  { type: 'weekly_summary', label: 'Weekly Summaries', description: 'Weekly performance digest and insights' },
  { type: 'streak_milestone', label: 'Streak Milestones', description: 'Celebrate your winning streaks and consistency' },
];

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const data = await getNotificationPreferences();
        setPreferences(data);
      } catch (err) {
        console.error('Failed to fetch preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const handleToggle = async (type: string, enabled: boolean) => {
    setSaving(type);
    try {
      await updateNotificationPreference(type, enabled);
      setPreferences(prev => ({ ...prev, [type]: enabled }));
    } catch (err) {
      console.error('Failed to update preference:', err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notificationTypes.map(({ type, label, description }) => (
        <div
          key={type}
          className="flex items-center justify-between p-3 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
        >
          <div className="flex-1">
            <div className="font-medium text-sm text-white">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{description}</div>
          </div>
          <button
            onClick={() => handleToggle(type, !preferences[type])}
            disabled={saving === type}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${preferences[type] ? 'bg-cyan-500' : 'bg-gray-600'}
              ${saving === type ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${preferences[type] ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
