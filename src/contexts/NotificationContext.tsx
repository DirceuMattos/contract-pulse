import React, { createContext, useContext } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useDbNotifications, type DbNotification } from '@/hooks/useDbNotifications';
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
  // Notificações persistidas (I1)
  dbNotifications: DbNotification[];
  dbUnreadCount: number;
  markDbAsRead: (id: string) => void;
  markAllDbAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const {
    items: dbNotifications,
    unreadCount: dbUnreadCount,
    markAsRead: markDbAsRead,
    markAllAsRead: markAllDbAsRead,
  } = useDbNotifications();
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

  // Alertas de contrato não são mais postados no sino (só notificações
  // persistidas na aba Mensagens). processAlerts segue disponível no contexto
  // para uso pontual (ex.: notificação de browser), mas não roda em massa aqui.

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
        processAlerts,
        dbNotifications,
        dbUnreadCount,
        markDbAsRead,
        markAllDbAsRead,
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
