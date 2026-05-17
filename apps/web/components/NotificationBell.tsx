'use client';

import { useState, useEffect } from 'react';
import { getNotifications, getNotificationCount, markAllNotificationsRead } from '../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
}

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await getNotificationCount();
        setCount(data.count);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications(10);
      setNotifications(data);
      setShowDropdown(true);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setCount(0);
      setNotifications([]);
      setShowDropdown(false);
    } catch {}
  };

  return (
    <div className="relative">
      <button
        onClick={fetchNotifications}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {showDropdown && notifications.length > 0 && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <span className="font-semibold">Notifications</span>
            <button onClick={markAllRead} className="text-sm text-blue-400 hover:text-blue-300">
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.map(n => (
              <div key={n.id} className="p-3 border-b border-gray-700 hover:bg-gray-750">
                <div className="font-medium text-sm">{n.title}</div>
                <div className="text-xs text-gray-400 mt-1">{n.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(n.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDropdown && notifications.length === 0 && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-4 text-center text-gray-400">
          No unread notifications
        </div>
      )}
    </div>
  );
}
