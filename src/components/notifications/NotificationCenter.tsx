import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Clock,
  RefreshCw,
  TrendingDown,
  Users,
  AlertTriangle,
  Settings,
  X,
} from 'lucide-react';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AlertType, Notification as AppNotification } from '@/types';
import { cn } from '@/lib/utils';

const alertTypeIcons: Record<AlertType, React.ReactNode> = {
  'reajuste-proximo': <Calendar className="w-4 h-4" />,
  'vigencia-fim': <Clock className="w-4 h-4" />,
  'desatualizacao': <RefreshCw className="w-4 h-4" />,
  'tendencia-deterioracao': <TrendingDown className="w-4 h-4" />,
  'concentracao-custo': <Users className="w-4 h-4" />,
  'financeiro-deficit': <TrendingDown className="w-4 h-4" />,
  'financeiro-margem-baixa': <TrendingDown className="w-4 h-4" />,
  'vigencia-vencido': <Clock className="w-4 h-4" />,
  'governanca-contatos': <Users className="w-4 h-4" />,
  'renovacao-proxima': <Calendar className="w-4 h-4" />,
  'hr-links-quebrados': <Users className="w-4 h-4" />,
  'deploy-uptime': <RefreshCw className="w-4 h-4" />,
  'deploy-backend': <RefreshCw className="w-4 h-4" />,
  'deploy-build': <RefreshCw className="w-4 h-4" />,
};

interface NotificationItemProps {
  notification: AppNotification;
  onRead: () => void;
  onDelete: () => void;
  onClick: () => void;
}

function NotificationItem({ notification, onRead, onDelete, onClick }: NotificationItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'p-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer',
        !notification.read && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'p-1.5 rounded-lg shrink-0',
            notification.severity === 'critico'
              ? 'bg-health-critical/10 text-health-critical'
              : 'bg-health-attention/10 text-health-attention'
          )}
        >
          {alertTypeIcons[notification.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className={cn('text-sm font-medium', !notification.read && 'font-semibold')}>
                {notification.title}
              </h4>
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] shrink-0',
                notification.severity === 'critico'
                  ? 'border-health-critical text-health-critical'
                  : 'border-health-attention text-health-attention'
              )}
            >
              {notification.severity === 'critico' ? 'Crítico' : 'Atenção'}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.description}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>

            <div className="flex items-center gap-1">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRead();
                  }}
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const {
    notifications,
    settings,
    unreadCount,
    criticalUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updateSettings,
    toggleBrowserNotifications,
    requestBrowserPermission,
    dbNotifications,
    dbUnreadCount,
    markDbAsRead,
    markAllDbAsRead,
  } = useNotificationContext();

  const criticalNotifications = notifications.filter((n) => n.severity === 'critico');
  const warningNotifications = notifications.filter((n) => n.severity === 'atencao');

  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    navigate(`/contratos/${notification.contractId}`);
  };

  const handleEnableBrowserNotifications = async () => {
    const permission = await requestBrowserPermission();
    if (permission === 'granted') {
      updateSettings({ browserNotificationsEnabled: true });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {dbUnreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-health-attention'
              )}
            >
              {dbUnreadCount > 99 ? '99+' : dbUnreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[400px] p-0" align="end">
        <Tabs defaultValue="mensagens">
          {/* Header */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Notificações</h3>
              <div className="flex items-center gap-2">
                {dbNotifications.some((n) => !n.lida) && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllDbAsRead}>
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </div>

            <TabsList className="w-full">
              <TabsTrigger value="mensagens" className="flex-1 text-xs">
                Mensagens ({dbNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Config
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Mensagens (notificações persistidas — I1) */}
          <TabsContent value="mensagens" className="m-0">
            <ScrollArea className="h-[350px]">
              {dbNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <Bell className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem</p>
                </div>
              ) : (
                dbNotifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.lida) markDbAsRead(n.id);
                      if (n.link) navigate(n.link);
                    }}
                    className={cn(
                      'w-full text-left p-3 border-b border-border hover:bg-muted/40 transition-colors',
                      !n.lida && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <h4 className={cn('text-sm', !n.lida && 'font-semibold')}>{n.titulo}</h4>
                      {!n.lida && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.mensagem && <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </button>
                ))
              )}
            </ScrollArea>
            {dbNotifications.some((n) => !n.lida) && (
              <div className="p-2 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={markAllDbAsRead}>
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Marcar todas como lidas
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="m-0 p-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Notificações do Navegador</h4>
                
                {settings.browserPermissionStatus === 'denied' ? (
                  <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <BellOff className="h-4 w-4" />
                      <span className="font-medium">Permissão negada</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      As notificações do navegador foram bloqueadas. Para habilitá-las, 
                      acesse as configurações do navegador e permita notificações para este site.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="browser-notifications" className="text-sm">
                          Ativar notificações
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Receba alertas mesmo com o navegador minimizado
                        </p>
                      </div>
                      <Switch
                        id="browser-notifications"
                        checked={settings.browserNotificationsEnabled}
                        onCheckedChange={toggleBrowserNotifications}
                      />
                    </div>

                    {settings.browserNotificationsEnabled && (
                      <>
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="notify-critical" className="text-sm">
                              Alertas críticos
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Situações que exigem ação imediata
                            </p>
                          </div>
                          <Switch
                            id="notify-critical"
                            checked={settings.notifyOnCritical}
                            onCheckedChange={(checked) =>
                              updateSettings({ notifyOnCritical: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="notify-warning" className="text-sm">
                              Alertas de atenção
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Situações que requerem acompanhamento
                            </p>
                          </div>
                          <Switch
                            id="notify-warning"
                            checked={settings.notifyOnWarning}
                            onCheckedChange={(checked) =>
                              updateSettings({ notifyOnWarning: checked })
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/alertas')}
              >
                Ver todos os alertas
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
