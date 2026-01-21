import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Notification as AppNotification, NotificationSettings, Alert } from '@/types';

const NOTIFICATIONS_KEY = 'bnp_notifications';
const NOTIFICATION_SETTINGS_KEY = 'bnp_notification_settings';

const defaultSettings: NotificationSettings = {
  browserNotificationsEnabled: false,
  browserPermissionStatus: 'default',
  notifyOnCritical: true,
  notifyOnWarning: false,
};

/**
 * Hook para gerenciar notificações in-app e browser notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<NotificationSettings>(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      const parsed = stored ? JSON.parse(stored) : defaultSettings;
      // Update permission status on load
      if (typeof Notification !== 'undefined') {
        parsed.browserPermissionStatus = Notification.permission;
      }
      return parsed;
    } catch {
      return defaultSettings;
    }
  });

  // Persist notifications to localStorage
  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }, [notifications]);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Request browser notification permission
  const requestBrowserPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      return 'denied' as const;
    }

    if (Notification.permission === 'granted') {
      setSettings(prev => ({
        ...prev,
        browserNotificationsEnabled: true,
        browserPermissionStatus: 'granted',
      }));
      return 'granted' as const;
    }

    if (Notification.permission === 'denied') {
      setSettings(prev => ({
        ...prev,
        browserNotificationsEnabled: false,
        browserPermissionStatus: 'denied',
      }));
      return 'denied' as const;
    }

    const permission = await Notification.requestPermission();
    setSettings(prev => ({
      ...prev,
      browserNotificationsEnabled: permission === 'granted',
      browserPermissionStatus: permission,
    }));
    return permission;
  }, []);

  // Send browser notification
  const sendBrowserNotification = useCallback((title: string, body: string, onClick?: () => void) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'bnp-contract-alert',
      requireInteraction: true,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  }, []);

  // Process new alerts and create notifications
  const processAlerts = useCallback((alerts: Alert[]) => {
    const existingAlertIds = new Set(notifications.map(n => n.alertId));
    const newNotifications: AppNotification[] = [];

    alerts.forEach(alert => {
      if (!existingAlertIds.has(alert.id)) {
        const shouldNotifyBrowser =
          settings.browserNotificationsEnabled &&
          ((alert.severity === 'critico' && settings.notifyOnCritical) ||
            (alert.severity === 'atencao' && settings.notifyOnWarning));

        const appNotification: AppNotification = {
          id: crypto.randomUUID(),
          alertId: alert.id,
          contractId: alert.contractId,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          read: false,
          browserNotified: shouldNotifyBrowser,
          createdAt: new Date().toISOString(),
        };

        newNotifications.push(appNotification);

        // Send browser notification for critical alerts
        if (shouldNotifyBrowser) {
          sendBrowserNotification(
            alert.severity === 'critico' ? '🚨 Alerta Crítico' : '⚠️ Atenção',
            `${alert.title}\n${alert.description}`
          );
        }
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev]);
    }
  }, [notifications, settings, sendBrowserNotification]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Delete notification
  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Update notification settings
  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Toggle browser notifications
  const toggleBrowserNotifications = useCallback(async () => {
    if (settings.browserNotificationsEnabled) {
      setSettings(prev => ({ ...prev, browserNotificationsEnabled: false }));
    } else {
      const permission = await requestBrowserPermission();
      if (permission === 'granted') {
        setSettings(prev => ({ ...prev, browserNotificationsEnabled: true }));
      }
    }
  }, [settings.browserNotificationsEnabled, requestBrowserPermission]);

  // Computed values
  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const criticalUnreadCount = useMemo(
    () => notifications.filter(n => !n.read && n.severity === 'critico').length,
    [notifications]
  );

  const recentNotifications = useMemo(
    () => notifications.slice(0, 50), // Keep last 50 notifications
    [notifications]
  );

  return {
    notifications: recentNotifications,
    settings,
    unreadCount,
    criticalUnreadCount,
    processAlerts,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updateSettings,
    requestBrowserPermission,
    toggleBrowserNotifications,
    sendBrowserNotification,
  };
}
