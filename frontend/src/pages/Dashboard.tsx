import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  CheckCircle,
  X,
  Send,
  Calendar,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  Zap,
  BarChart3,
  PieChart,
  Users,
  MessageSquare,
  Eye,
  ThumbsUp,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { dashboardAPI, DashboardStats, sourceChannelsAPI, targetChannelsAPI, SourceChannel, TargetChannel } from '../services/api';

interface StatCardProps {
  title: string;
  value: number | undefined | null;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: number;
  t?: (key: string) => string;
}

const colorClasses = {
  primary: 'bg-gradient-to-br from-blue-500/10 to-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50',
  secondary: 'bg-gradient-to-br from-gray-500/10 to-gray-600/10 text-gray-700 dark:text-gray-400 border-gray-200/50 dark:border-gray-800/50',
  success: 'bg-gradient-to-br from-green-500/10 to-emerald-600/10 text-green-700 dark:text-green-400 border-green-200/50 dark:border-green-800/50',
  warning: 'bg-gradient-to-br from-yellow-500/10 to-orange-600/10 text-yellow-700 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-800/50',
  error: 'bg-gradient-to-br from-red-500/10 to-red-600/10 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-800/50',
  info: 'bg-gradient-to-br from-cyan-500/10 to-blue-600/10 text-cyan-700 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-800/50',
};

const iconColorClasses = {
  primary: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25',
  secondary: 'bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-500/25',
  success: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25',
  warning: 'bg-gradient-to-br from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-500/25',
  error: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25',
  info: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25',
};

const textColorClasses = {
  primary: 'text-blue-700 dark:text-blue-400',
  secondary: 'text-gray-700 dark:text-gray-400',
  success: 'text-green-700 dark:text-green-400',
  warning: 'text-yellow-700 dark:text-yellow-400',
  error: 'text-red-700 dark:text-red-400',
  info: 'text-cyan-700 dark:text-cyan-400',
};

function StatCard({ title, value, icon, color = 'primary', subtitle, trend, progress, t }: StatCardProps) {
  return (
    <Card className={`h-full border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${colorClasses[color]}`}>
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-xl ${iconColorClasses[color]} transition-transform duration-300 hover:scale-110`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend.isPositive 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className={`text-2xl lg:text-3xl font-bold ${textColorClasses[color]}`}>
            {value !== undefined && value !== null ? value.toLocaleString() : '0'}
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
          {progress !== undefined && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {progress}% {t ? t('dashboard.ofTarget') : 'от цели'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
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
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">{t('dashboard.loadingStats')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          {t('dashboard.errorLoading')}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  // Вычисляем дополнительную статистику
  const totalPosts = stats.pending_posts + stats.approved_posts + stats.rejected_posts + stats.published_posts;
  const successRate = totalPosts > 0 ? Math.round((stats.published_posts / totalPosts) * 100) : 0;
  const approvalRate = totalPosts > 0 ? Math.round(((stats.approved_posts + stats.published_posts) / totalPosts) * 100) : 0;
  const channelEfficiency = stats.total_source_channels > 0 ? Math.round((stats.active_source_channels / stats.total_source_channels) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {t('dashboard.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('dashboard.subtitle')} • {t('dashboard.updated')} {new Date().toLocaleTimeString('ru-RU')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.contentSources')}
          value={stats.active_source_channels}
          icon={<ArrowRight className="h-6 w-6" />}
          color="primary"
          subtitle={`${t('dashboard.totalLabel')}: ${stats.total_source_channels}`}
          progress={channelEfficiency}
          trend={{ value: 12, isPositive: true }}
          t={t}
        />
        <StatCard
          title={t('dashboard.targetChannelsLabel')}
          value={stats.active_target_channels}
          icon={<Target className="h-6 w-6" />}
          color="secondary"
          subtitle={`${t('dashboard.totalLabel')}: ${stats.total_target_channels}`}
          progress={Math.round((stats.active_target_channels / Math.max(stats.total_target_channels, 1)) * 100)}
          trend={{ value: 8, isPositive: true }}
          t={t}
        />
        <StatCard
          title={t('dashboard.postsToday')}
          value={stats.posts_today}
          icon={<Calendar className="h-6 w-6" />}
          color="info"
          subtitle={t('dashboard.postsLast24h')}
          trend={{ value: 25, isPositive: true }}
        />
        <StatCard
          title={t('dashboard.publishedLabel')}
          value={stats.published_posts}
          icon={<Send className="h-6 w-6" />}
          color="success"
          subtitle={`${t('dashboard.successRate')}: ${successRate}%`}
          progress={successRate}
          trend={{ value: 15, isPositive: true }}
          t={t}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="border-2 border-green-200/50 dark:border-green-800/50 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-600" />
              {t('dashboard.efficiency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('dashboard.approval')}</span>
                <span className="font-semibold text-green-700 dark:text-green-400">{approvalRate}%</span>
              </div>
              <Progress value={approvalRate} className="h-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('dashboard.publication')}</span>
                <span className="font-semibold text-green-700 dark:text-green-400">{successRate}%</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              {t('dashboard.activity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('dashboard.channels')}</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">{channelEfficiency}%</span>
              </div>
              <Progress value={channelEfficiency} className="h-2" />
              <div className="text-xs text-muted-foreground">
                  {stats.active_source_channels} {t('dashboard.ofTotal')} {stats.total_source_channels} {t('dashboard.active')}
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200/50 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              {t('dashboard.performance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {totalPosts}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('dashboard.totalPostsProcessed')}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{stats.published_posts} {t('dashboard.published')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>{stats.pending_posts} {t('dashboard.pending')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts Status */}
      <Card className="border-2 border-orange-200/50 dark:border-orange-800/50 bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/20">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <PieChart className="h-5 w-5 text-orange-600" />
            {t('dashboard.postsStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-2 sm:p-3 lg:p-4">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                {stats.pending_posts}
              </div>
              <Badge variant="secondary" className="w-full justify-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('posts.pendingProcessing')}</span>
                <span className="sm:hidden">{t('posts.pending')}</span>
              </Badge>
            </div>
            <div className="text-center p-2 sm:p-3 lg:p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                {stats.approved_posts}
              </div>
              <Badge variant="default" className="w-full justify-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('posts.approved')}</span>
                <span className="sm:hidden">{t('posts.approvedShort')}</span>
              </Badge>
            </div>
            <div className="text-center p-2 sm:p-3 lg:p-4">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                {stats.rejected_posts}
              </div>
              <Badge variant="destructive" className="w-full justify-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('posts.rejected')}</span>
                <span className="sm:hidden">{t('posts.rejectedShort')}</span>
              </Badge>
            </div>
            <div className="text-center p-2 sm:p-3 lg:p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {stats.published_posts}
              </div>
              <Badge variant="default" className="w-full justify-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('posts.published')}</span>
                <span className="sm:hidden">{t('posts.publishedShort')}</span>
              </Badge>
            </div>
          </div>
          
          {/* Visual Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t('dashboard.processingProgress')}</span>
              <span>{totalPosts} {t('dashboard.postsLabel')}</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {totalPosts > 0 && (
                <>
                  <div 
                    className="bg-yellow-500 transition-all duration-500"
                    style={{ width: `${(stats.pending_posts / totalPosts) * 100}%` }}
                  />
                  <div 
                    className="bg-green-500 transition-all duration-500"
                    style={{ width: `${(stats.approved_posts / totalPosts) * 100}%` }}
                  />
                  <div 
                    className="bg-red-500 transition-all duration-500"
                    style={{ width: `${(stats.rejected_posts / totalPosts) * 100}%` }}
                  />
                  <div 
                    className="bg-blue-500 transition-all duration-500"
                    style={{ width: `${(stats.published_posts / totalPosts) * 100}%` }}
                  />
                </>
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                {t('dashboard.pending')}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {t('dashboard.approved')}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                {t('dashboard.rejected')}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                {t('dashboard.publishedStatus')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Source Channels */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-lg">{t('channels.sourceChannels')}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/source-channels')}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <span className="hidden sm:inline">{t('common.showAll')}</span>
                <span className="sm:hidden">{t('common.all')}</span>
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
                      <span className="hidden sm:inline">{channel.is_active ? t('common.active') : t('common.inactive')}</span>
                      <span className="sm:hidden">{channel.is_active ? t('common.activeShort') : t('common.inactiveShort')}</span>
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 sm:py-6">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('channels.noSourceChannels')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Target Channels */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-lg">{t('channels.targetChannels')}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/target-channels')}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <span className="hidden sm:inline">{t('common.showAll')}</span>
                <span className="sm:hidden">{t('common.all')}</span>
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
                      <span className="hidden sm:inline">{channel.is_active ? t('common.active') : t('common.inactive')}</span>
                      <span className="sm:hidden">{channel.is_active ? t('common.activeShort') : t('common.inactiveShort')}</span>
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 sm:py-6">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('channels.noTargetChannels')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.systemStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.systemStatus1')}
              </p>
            </div>
            <div className="text-center p-4">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.systemStatus2')}
              </p>
            </div>
            <div className="text-center p-4">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.systemStatus3')}
              </p>
            </div>
            <div className="text-center p-4">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.systemStatus4')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}