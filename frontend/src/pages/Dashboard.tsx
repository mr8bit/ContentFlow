import React from 'react';
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  CheckCircle,
  X,
  Send,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useQuery } from 'react-query';
import { dashboardAPI, DashboardStats, sourceChannelsAPI, targetChannelsAPI, SourceChannel, TargetChannel } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
}

const colorClasses = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary-foreground',
  success: 'bg-green-500/10 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  warning: 'bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
  error: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
};

const textColorClasses = {
  primary: 'text-primary',
  secondary: 'text-secondary-foreground',
  success: 'text-green-700 dark:text-green-400',
  warning: 'text-yellow-700 dark:text-yellow-400',
  error: 'text-destructive',
  info: 'text-blue-700 dark:text-blue-400',
};

function StatCard({ title, value, icon, color = 'primary', subtitle }: StatCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-lg sm:text-2xl lg:text-3xl font-bold ${textColorClasses[color]}`}>
              {value.toLocaleString()}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {title}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardStats>('dashboard-stats', () =>
    dashboardAPI.getStats().then((res: { data: DashboardStats }) => res.data)
  );

  const { data: sourceChannels } = useQuery<SourceChannel[]>(
    'dashboard-source-channels',
    () => sourceChannelsAPI.getAll().then((res: { data: SourceChannel[] }) => res.data.slice(0, 3))
  );

  const { data: targetChannels } = useQuery<TargetChannel[]>(
    'dashboard-target-channels', 
    () => targetChannelsAPI.getAll().then((res: { data: TargetChannel[] }) => res.data.slice(0, 3))
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          Ошибка загрузки статистики
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Повторить
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Панель управления
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Обзор системы автоматического репостинга
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4">
        {/* Channels Stats */}
        <StatCard
          title="Исходные каналы"
          value={stats.active_source_channels}
          icon={<ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />}
          color="primary"
          subtitle={`Всего: ${stats.total_source_channels}`}
        />
        <StatCard
          title="Целевые каналы"
          value={stats.active_target_channels}
          icon={<ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />}
          color="secondary"
          subtitle={`Всего: ${stats.total_target_channels}`}
        />
        <StatCard
          title="Посты сегодня"
          value={stats.posts_today}
          icon={<Calendar className="h-5 w-5 sm:h-6 sm:w-6" />}
          color="info"
        />
        <StatCard
          title="Опубликовано"
          value={stats.published_posts}
          icon={<Send className="h-5 w-5 sm:h-6 sm:w-6" />}
          color="success"
        />
      </div>

      {/* Posts Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Статус постов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-2 sm:p-3 lg:p-4">
              <Badge variant="secondary" className="w-full justify-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Ожидают обработки:</span>
                <span className="sm:hidden">Ожидают:</span>
                {stats.pending_posts}
              </Badge>
            </div>
            <div className="text-center p-2 sm:p-3 lg:p-4">
              <Badge variant="default" className="w-full justify-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Одобрено:</span>
                <span className="sm:hidden">Одобр.:</span>
                {stats.approved_posts}
              </Badge>
            </div>
            <div className="text-center p-2 sm:p-3 lg:p-4">
              <Badge variant="destructive" className="w-full justify-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Отклонено:</span>
                <span className="sm:hidden">Откл.:</span>
                {stats.rejected_posts}
              </Badge>
            </div>
            <div className="text-center p-2 sm:p-3 lg:p-4">
              <Badge variant="default" className="w-full justify-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Опубликовано:</span>
                <span className="sm:hidden">Опубл.:</span>
                {stats.published_posts}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Source Channels */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-lg">Исходные каналы</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/source-channels')}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Показать все</span>
                <span className="sm:hidden">Все</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sourceChannels && sourceChannels.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {sourceChannels.map((channel) => (
                  <div key={channel.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/30">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {channel.channel_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        ID: {channel.channel_id}
                      </p>
                    </div>
                    <Badge 
                      variant={channel.is_active ? 'default' : 'secondary'}
                      className="gap-1 text-xs flex-shrink-0"
                    >
                      {channel.is_active ? (
                        <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3" />
                      ) : (
                        <X className="h-2 w-2 sm:h-3 sm:w-3" />
                      )}
                      <span className="hidden sm:inline">{channel.is_active ? 'Активен' : 'Неактивен'}</span>
                      <span className="sm:hidden">{channel.is_active ? 'Акт.' : 'Неакт.'}</span>
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 sm:py-6">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Нет настроенных исходных каналов
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Target Channels */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-lg">Целевые каналы</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/target-channels')}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Показать все</span>
                <span className="sm:hidden">Все</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {targetChannels && targetChannels.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {targetChannels.map((channel) => (
                  <div key={channel.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/30">
                    <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 text-secondary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {channel.channel_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        ID: {channel.channel_id}
                      </p>
                    </div>
                    <Badge 
                      variant={channel.is_active ? 'default' : 'secondary'}
                      className="gap-1 text-xs flex-shrink-0"
                    >
                      {channel.is_active ? (
                        <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3" />
                      ) : (
                        <X className="h-2 w-2 sm:h-3 sm:w-3" />
                      )}
                      <span className="hidden sm:inline">{channel.is_active ? 'Активен' : 'Неактивен'}</span>
                      <span className="sm:hidden">{channel.is_active ? 'Акт.' : 'Неакт.'}</span>
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 sm:py-6">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Нет настроенных целевых каналов
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Статус системы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4">
              <p className="text-sm text-muted-foreground">
                Система мониторинга активна и отслеживает новые посты в исходных каналах
              </p>
            </div>
            <div className="text-center p-4">
              <p className="text-sm text-muted-foreground">
                Обработка текстов через OpenRouter API работает в фоновом режиме
              </p>
            </div>
            <div className="text-center p-4">
              <p className="text-sm text-muted-foreground">
                Одобренные посты автоматически публикуются в целевые каналы
              </p>
            </div>
            <div className="text-center p-4">
              <p className="text-sm text-muted-foreground">
                Все операции логируются и доступны для просмотра
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}