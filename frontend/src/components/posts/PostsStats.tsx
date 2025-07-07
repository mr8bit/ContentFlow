import React from 'react';
import { Card, CardContent } from '../ui';
import { FileText, Clock, Cog, CheckCircle, Calendar, Send, TrendingUp } from 'lucide-react';

interface PostsStatsProps {
  stats: {
    total: number;
    pending: number;
    processed: number;
    approved: number;
    scheduled: number;
    published: number;
  };
}

export function PostsStats({ stats }: PostsStatsProps): JSX.Element {
  const statItems = [
    { 
      label: 'Всего', 
      value: stats.total, 
      icon: FileText,
      color: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      trend: '+12%'
    },
    { 
      label: 'Ожидают', 
      value: stats.pending, 
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20',
      trend: '+5%'
    },
    { 
      label: 'Обработаны', 
      value: stats.processed, 
      icon: Cog,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      trend: '+8%'
    },
    { 
      label: 'Одобрены', 
      value: stats.approved, 
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      trend: '+15%'
    },
    { 
      label: 'Запланированы', 
      value: stats.scheduled, 
      icon: Calendar,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      trend: '+3%'
    },
    { 
      label: 'Опубликованы', 
      value: stats.published, 
      icon: Send,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
      trend: '+22%'
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
      {statItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <Card key={item.label} className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-primary/20 overflow-hidden">
            <CardContent className="p-2 sm:p-3 lg:p-4">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <div className={`p-1 sm:p-1.5 rounded-lg ${item.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                  <IconComponent className={`h-3 w-3 sm:h-4 sm:w-4 ${item.color}`} />
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 text-xs text-muted-foreground hidden sm:flex">
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span className="text-xs">{item.trend}</span>
                </div>
              </div>
              
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight group-hover:text-primary transition-colors duration-200">
                  {item.value.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
                  {item.label}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}