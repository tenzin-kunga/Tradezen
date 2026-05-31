'use client';

import { useState, useEffect, useCallback } from 'react';
import { getNotifications, getNotificationCount, markAllNotificationsRead } from '../lib/api';
import { useRealtime } from '../hooks/use-realtime';
import { NotificationItem } from './NotificationItem';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch initial count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await getNotificationCount();
        setCount(data.count);
      } catch (err) {
        console.error('Failed to fetch notification count:', err);
      }
    };
    fetchCount();
  }, []);

  // Real-time notification push via WebSocket
  useRealtime('notification:created', useCallback((data: unknown) => {
    const notification = data as Notification;
    setCount(prev => prev + 1);
    setNotifications(prev => [notification, ...prev]);
    
    // Show toast for new notification
    showToast(notification);
  }, []));

  useRealtime('notification:count', useCallback((data: unknown) => {
    const { count: newCount } = data as { count: number };
    setCount(newCount);
  }, []));

  const fetchNotifications = async () => {
    if (showDropdown) {
      setShowDropdown(false);
      return;
    }
    
    setLoading(true);
    try {
      const data = await getNotifications(10);
      setNotifications(data);
      setShowDropdown(true);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setCount(0);
      setNotifications([]);
      setShowDropdown(false);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleRead = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setCount(prev => Math.max(0, prev - 1));
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-bell-container')) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className="relative notification-bell-container">
      <button
        onClick={fetchNotifications}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-850">
            <span className="font-semibold text-white">Notifications</span>
            {count > 0 && (
              <button onClick={markAllRead} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-cyan-400 rounded-full mx-auto"></div>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map(n => (
                <NotificationItem key={n.id} notification={n} onRead={handleRead} />
              ))
            ) : (
              <div className="p-6 text-center text-gray-400">
                <div className="text-3xl mb-2">🔔</div>
                <div>No unread notifications</div>
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-2 border-t border-gray-700 bg-gray-850">
              <button
                onClick={() => window.location.href = '/settings?tab=notifications'}
                className="w-full text-center text-xs text-gray-400 hover:text-white py-2 transition-colors"
              >
                Notification Settings →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function showToast(notification: Notification) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl z-50 animate-slide-in';
  toast.innerHTML = `
    <div class="font-medium text-sm text-white">${notification.title}</div>
    <div class="text-xs text-gray-400 mt-1">${notification.message}</div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('animate-slide-out');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
