'use client';

import { markNotificationRead } from '../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const typeConfig: Record<string, { color: string; icon: string }> = {
  coaching: { color: '#3b82f6', icon: '🎯' },
  drawdown_alert: { color: '#ef4444', icon: '📉' },
  journal_reminder: { color: '#f59e0b', icon: '📝' },
  streak_milestone: { color: '#10b981', icon: '🔥' },
  weekly_summary: { color: '#8b5cf6', icon: '📊' },
  fomo_warning: { color: '#f97316', icon: '⚠️' },
  discipline_reminder: { color: '#06b6d4', icon: '🧠' },
};

export function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const config = typeConfig[notification.type] || { color: '#6b7280', icon: '📌' };

  const handleMarkRead = async () => {
    try {
      await markNotificationRead(notification.id);
      onRead(notification.id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <div
      className="p-3 border-b border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
      onClick={handleMarkRead}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ background: `${config.color}20`, color: config.color }}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-white">{notification.title}</div>
          <div className="text-xs text-gray-400 mt-1 line-clamp-2">{notification.message}</div>
          <div className="text-xs text-gray-500 mt-1">{timeAgo}</div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
