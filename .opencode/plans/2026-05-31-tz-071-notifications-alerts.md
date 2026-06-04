# TZ-071 Notifications & Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the notification system with real-time push, user preferences, and polished UI for a trading journal app.

**Architecture:** Enhance existing backend (NotificationService, NotificationTriggersService, WebSocket gateway) with real-time push and preferences. Upgrade frontend NotificationBell with better UX and add notification preferences to Settings page.

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, Socket.IO, Next.js, Tailwind CSS

---

## Current State Analysis

**Backend (Complete):**
- `NotificationService` - CRUD operations
- `NotificationTriggersService` - Auto-triggers (drawdown, FOMO, losing streak, journal reminder)
- Chat controller endpoints for notifications
- WebSocket gateway with `emitToUser()` method
- Database schema: `notifications` table

**Frontend (Partial):**
- `NotificationBell.tsx` - Basic dropdown with polling (60s interval)
- API functions for notifications
- WebSocket infrastructure (`useRealtime` hook, `socket.ts`)

**Missing:**
1. Real-time push via WebSocket (currently polling)
2. Notification preferences (opt-in/out per type)
3. Polished UI (type icons, animations, mobile-friendly)
4. Settings page integration

---

## File Structure

### Files to Create
- `apps/web/components/NotificationItem.tsx` - Individual notification component
- `apps/web/components/NotificationPreferences.tsx` - Preferences panel for Settings

### Files to Modify
- `apps/web/components/NotificationBell.tsx` - Enhance with WebSocket, better UI
- `apps/web/app/settings/page.tsx` - Add notification preferences section
- `apps/api/src/common/services/notification.service.ts` - Add preferences methods
- `apps/api/src/db/schema/index.ts` - Add notification_preferences table
- `apps/api/src/chat/chat.controller.ts` - Add preferences endpoints
- `apps/web/lib/api.ts` - Add preferences API functions

---

## Task 1: Add Notification Preferences Schema & Service

**Files:**
- Modify: `apps/api/src/db/schema/index.ts`
- Modify: `apps/api/src/common/services/notification.service.ts`

- [ ] **Step 1: Add notification_preferences table to schema**

```typescript
// apps/api/src/db/schema/index.ts - Add after notifications table
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    enabled: boolean('enabled').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.type),
    index('idx_notification_prefs_user').on(table.userId),
  ],
);
```

- [ ] **Step 2: Add preferences methods to NotificationService**

```typescript
// apps/api/src/common/services/notification.service.ts - Add methods

async getPreferences(userId: string): Promise<Record<string, boolean>> {
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
  
  // Default all types to enabled if no preference set
  const allTypes = [
    'coaching', 'drawdown_alert', 'journal_reminder',
    'streak_milestone', 'weekly_summary', 'fomo_warning', 'discipline_reminder'
  ];
  
  const result: Record<string, boolean> = {};
  for (const type of allTypes) {
    const pref = prefs.find(p => p.type === type);
    result[type] = pref?.enabled ?? true;
  }
  return result;
}

async updatePreference(userId: string, type: string, enabled: boolean): Promise<void> {
  await db
    .insert(notificationPreferences)
    .values({ userId, type, enabled })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.type],
      set: { enabled, updatedAt: new Date() },
    });
}

async isTypeEnabled(userId: string, type: string): Promise<boolean> {
  const pref = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.type, type),
    ),
  });
  return pref?.enabled ?? true; // Default to enabled
}
```

- [ ] **Step 3: Update NotificationTriggersService to check preferences**

```typescript
// apps/api/src/common/services/notification-triggers.service.ts - Modify checkAndNotify

async checkAndNotify(userId: string): Promise<void> {
  try {
    const analytics = await this.tradesService.getAnalytics(userId);
    const behavioral = await this.behavioralService.analyzeBehavior(userId);

    // Drawdown alert (check preference first)
    if ((analytics as any).maxDrawdown > 1000) {
      const enabled = await this.notificationService.isTypeEnabled(userId, 'drawdown_alert');
      if (enabled) {
        await this.notificationService.create(
          userId,
          'drawdown_alert',
          'Significant Drawdown Detected',
          `Your maximum drawdown is $${(analytics as any).maxDrawdown.toFixed(2)}. Consider reviewing your risk management.`,
          { maxDrawdown: (analytics as any).maxDrawdown },
        );
      }
    }

    // FOMO warning (check preference first)
    if (behavioral.fomo.fomoScore > 0.7) {
      const enabled = await this.notificationService.isTypeEnabled(userId, 'fomo_warning');
      if (enabled) {
        await this.notificationService.create(
          userId,
          'fomo_warning',
          'High FOMO Risk',
          `Your FOMO score is ${Math.round(behavioral.fomo.fomoScore * 100)}/100. Take a break and review your trading plan before your next trade.`,
          { fomoScore: behavioral.fomo.fomoScore },
        );
      }
    }

    // Losing streak (check preference first)
    const advanced = await this.tradesService.getAdvancedAnalytics(userId);
    if (
      (advanced as any).currentStreak?.type === 'loss' &&
      (advanced as any).currentStreak?.count >= 3
    ) {
      const enabled = await this.notificationService.isTypeEnabled(userId, 'coaching');
      if (enabled) {
        await this.notificationService.create(
          userId,
          'coaching',
          'Losing Streak Alert',
          `You're on a ${(advanced as any).currentStreak.count}-trade losing streak. Consider stepping back and reviewing your strategy.`,
          { streak: (advanced as any).currentStreak },
        );
      }
    }

    // Journal reminder (check preference first)
    const streak = await this.journalsService.getStreak(userId);
    if ((streak as any).currentStreak === 0) {
      const enabled = await this.notificationService.isTypeEnabled(userId, 'journal_reminder');
      if (enabled) {
        await this.notificationService.create(
          userId,
          'journal_reminder',
          'Journal Reminder',
          "You haven't journaled recently. Taking 2 minutes to reflect on your trading can significantly improve your performance.",
          {},
        );
      }
    }
  } catch (error) {
    this.logger.error(
      `Notification trigger failed: ${(error as Error).message}`,
    );
  }
}
```

- [ ] **Step 4: Commit schema and service changes**

```bash
git add apps/api/src/db/schema/index.ts apps/api/src/common/services/notification.service.ts apps/api/src/common/services/notification-triggers.service.ts
git commit -m "feat(api): add notification preferences schema and service methods"
```

---

## Task 2: Add Notification Preferences API Endpoints

**Files:**
- Modify: `apps/api/src/chat/chat.controller.ts`
- Modify: `apps/web/lib/api.ts`

- [ ] **Step 1: Add preferences endpoints to chat controller**

```typescript
// apps/api/src/chat/chat.controller.ts - Add after notification endpoints

@Get('notifications/preferences')
@ApiOperation({ summary: 'Get notification preferences' })
async getNotificationPreferences(@CurrentUser('id') userId: string) {
  return this.notificationService.getPreferences(userId);
}

@Put('notifications/preferences')
@ApiOperation({ summary: 'Update notification preference' })
async updateNotificationPreference(
  @CurrentUser('id') userId: string,
  @Body('type') type: string,
  @Body('enabled') enabled: boolean,
) {
  await this.notificationService.updatePreference(userId, type, enabled);
  return { message: 'Preference updated' };
}
```

- [ ] **Step 2: Add API functions to frontend**

```typescript
// apps/web/lib/api.ts - Add after notification functions

export async function getNotificationPreferences() {
  const res = await authFetch(`${API}/chat/notifications/preferences`);
  return handleResponse<Record<string, boolean>>(res);
}

export async function updateNotificationPreference(type: string, enabled: boolean) {
  const res = await authFetch(`${API}/chat/notifications/preferences`, {
    method: 'PUT',
    body: JSON.stringify({ type, enabled }),
  });
  return handleResponse<{ message: string }>(res);
}
```

- [ ] **Step 3: Commit endpoint changes**

```bash
git add apps/api/src/chat/chat.controller.ts apps/web/lib/api.ts
git commit -m "feat(api): add notification preferences endpoints"
```

---

## Task 3: Create NotificationItem Component

**Files:**
- Create: `apps/web/components/NotificationItem.tsx`

- [ ] **Step 1: Create NotificationItem component**

```tsx
// apps/web/components/NotificationItem.tsx
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
```

- [ ] **Step 2: Commit NotificationItem component**

```bash
git add apps/web/components/NotificationItem.tsx
git commit -m "feat(web): add NotificationItem component with type icons"
```

---

## Task 4: Enhance NotificationBell with WebSocket & Better UI

**Files:**
- Modify: `apps/web/components/NotificationBell.tsx`

- [ ] **Step 1: Rewrite NotificationBell with WebSocket support**

```tsx
// apps/web/components/NotificationBell.tsx
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
```

- [ ] **Step 2: Add animation CSS to globals.css**

```css
// apps/web/app/globals.css - Add at end

@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slide-out {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}

.animate-slide-out {
  animation: slide-out 0.3s ease-in;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

- [ ] **Step 3: Commit enhanced NotificationBell**

```bash
git add apps/web/components/NotificationBell.tsx apps/web/components/NotificationItem.tsx apps/web/app/globals.css
git commit -m "feat(web): enhance NotificationBell with WebSocket push and improved UI"
```

---

## Task 5: Create NotificationPreferences Component

**Files:**
- Create: `apps/web/components/NotificationPreferences.tsx`

- [ ] **Step 1: Create NotificationPreferences component**

```tsx
// apps/web/components/NotificationPreferences.tsx
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
```

- [ ] **Step 2: Commit NotificationPreferences component**

```bash
git add apps/web/components/NotificationPreferences.tsx
git commit -m "feat(web): add NotificationPreferences component for Settings page"
```

---

## Task 6: Integrate Preferences into Settings Page

**Files:**
- Modify: `apps/web/app/settings/page.tsx`

- [ ] **Step 1: Add notification preferences section to Settings page**

```tsx
// apps/web/app/settings/page.tsx - Add after existing sections, before return closing

{/* Notification Preferences */}
<div className={sectionCls}>
  <h2 className="text-sm font-bold tracking-widest mb-4">NOTIFICATION PREFERENCES</h2>
  <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
    Choose which alerts and reminders you want to receive
  </p>
  <NotificationPreferences />
</div>
```

- [ ] **Step 2: Add import for NotificationPreferences**

```typescript
// apps/web/app/settings/page.tsx - Add to imports
import { NotificationPreferences } from "@/components/NotificationPreferences";
```

- [ ] **Step 3: Commit Settings integration**

```bash
git add apps/web/app/settings/page.tsx
git commit -m "feat(web): integrate NotificationPreferences into Settings page"
```

---

## Task 7: Add Backend WebSocket Push for Notifications

**Files:**
- Modify: `apps/api/src/common/services/notification.service.ts`
- Modify: `apps/api/src/chat/chat.module.ts`

- [ ] **Step 1: Inject TradesGateway into NotificationService**

```typescript
// apps/api/src/common/services/notification.service.ts - Update constructor

import { TradesGateway } from '../../gateway/trades.gateway';

@Injectable()
export class NotificationService {
  constructor(private readonly gateway: TradesGateway) {}

  // ... existing methods
```

- [ ] **Step 2: Add WebSocket push to create method**

```typescript
// apps/api/src/common/services/notification.service.ts - Modify create method

async create(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId,
      type,
      title,
      message,
      metadata,
    })
    .returning();

  // Push real-time notification via WebSocket
  this.gateway.emitToUser(userId, 'notification:created', {
    id: notification.id,
    type,
    title,
    message,
    createdAt: notification.createdAt,
    metadata,
  });

  // Update unread count
  const count = await this.getCount(userId);
  this.gateway.emitToUser(userId, 'notification:count', { count });
}
```

- [ ] **Step 3: Update chat module to provide gateway**

```typescript
// apps/api/src/chat/chat.module.ts - Add gateway import

import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    // ... existing imports
    GatewayModule,
  ],
  // ... rest of module
})
export class ChatModule {}
```

- [ ] **Step 4: Commit WebSocket push implementation**

```bash
git add apps/api/src/common/services/notification.service.ts apps/api/src/chat/chat.module.ts
git commit -m "feat(api): add real-time WebSocket push for notifications"
```

---

## Task 8: Test & Verify

- [ ] **Step 1: Run API lint and type check**

```bash
cd apps/api && npm run lint
cd apps/api && npm run check-types
```

- [ ] **Step 2: Run web lint and type check**

```bash
cd apps/web && npm run lint
cd apps/web && npm run check-types
```

- [ ] **Step 3: Manual testing checklist**

1. Start API and web dev servers
2. Create a trade that triggers a notification (e.g., high drawdown)
3. Verify notification appears in bell dropdown
4. Verify real-time push works (notification appears without refresh)
5. Test mark as read functionality
6. Test mark all as read
7. Test notification preferences in Settings
8. Verify preferences persist and affect trigger behavior
9. Test mobile responsiveness of notification dropdown
10. Test toast notification appears for real-time alerts

- [ ] **Step 4: Final commit with all changes**

```bash
git add -A
git commit -m "feat: complete TZ-071 notifications and alerts system"
```

---

## Verification

After implementation, verify:
1. ✅ Real-time notifications push via WebSocket (no polling)
2. ✅ Toast notifications appear for new alerts
3. ✅ Notification preferences save and persist
4. ✅ Preferences affect which notifications are created
5. ✅ Mobile-friendly dropdown and preferences UI
6. ✅ All lint and type checks pass
7. ✅ Existing functionality not broken

---

## Next Steps

After TZ-071 is complete, the next recommended slice is:
- **TZ-070 Mobile Optimization** - Broader responsive redesign across all pages
- **TZ-080 Monitoring Stack** - Grafana, Prometheus, health metrics (Sentry already integrated)
