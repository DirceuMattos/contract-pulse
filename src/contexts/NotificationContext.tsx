import React, { createContext, useContext, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAlerts } from '@/hooks/useAlerts';
import type { Notification as AppNotification, NotificationSettings } from '@/types';

interface NotificationContextType {
  notifications: AppNotification[];
  settings: NotificationSettings;
  unreadCount: number;
  criticalUnreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  updateSettings: (updates: Partial<NotificationSettings>) => void;
  requestBrowserPermission: () => Promise<NotificationPermission>;
  toggleBrowserNotifications: () => Promise<void>;
  processAlerts: (alerts: import('@/types').Alert[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { alerts } = useAlerts();
  const {
    notifications,
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
  } = useNotifications();

  // Process alerts when they change
  useEffect(() => {
    if (alerts.length > 0) {
      processAlerts(alerts);
    }
  }, [alerts, processAlerts]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        settings,
        unreadCount,
        criticalUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        updateSettings,
        requestBrowserPermission,
        toggleBrowserNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
