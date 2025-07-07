import React from 'react';
import { Card, CardContent, Tabs, TabsList, TabsTrigger, Badge } from '../ui';
import { Post } from '../../types';
import { FileText, Clock, Cog, CheckCircle, Calendar, Send, XCircle } from 'lucide-react';

interface PostsFiltersProps {
  statusFilters: readonly string[];
  statusLabels: Record<string, string>;
  selectedTab: number;
  posts: Post[] | undefined;
  onTabChange: (tabIndex: number) => void;
}

const statusIcons: Record<string, any> = {
  all: FileText,
  pending: Clock,
  processed: Cog,
  approved: CheckCircle,
  rejected: XCircle,
  scheduled: Calendar,
  published: Send,
};

const statusColors: Record<string, string> = {
  all: 'text-slate-600 dark:text-slate-400',
  pending: 'text-amber-600 dark:text-amber-400',
  processed: 'text-blue-600 dark:text-blue-400',
  approved: 'text-green-600 dark:text-green-400',
  rejected: 'text-red-600 dark:text-red-400',
  scheduled: 'text-purple-600 dark:text-purple-400',
  published: 'text-emerald-600 dark:text-emerald-400',
};

export function PostsFilters({
  statusFilters,
  statusLabels,
  selectedTab,
  posts,
  onTabChange,
}: PostsFiltersProps): JSX.Element {
  const getPostCount = (status: string): number => {
    if (!posts) return 0;
    return status === 'all' ? posts.length : posts.filter(p => p.status === status).length;
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-3 sm:p-6">
        <div className="mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-0.5 sm:mb-1">Фильтр по статусу</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Выберите статус для фильтрации постов</p>
        </div>
        
        <Tabs 
          value={statusFilters[selectedTab]} 
          onValueChange={(value) => onTabChange(statusFilters.indexOf(value))}
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 h-auto bg-muted/50 p-0.5 sm:p-1 gap-0.5 sm:gap-1">
            {statusFilters.map((status) => {
              const IconComponent = statusIcons[status];
              const count = getPostCount(status);
              const isActive = statusFilters[selectedTab] === status;
              
              return (
                <TabsTrigger 
                  key={status} 
                  value={status}
                  className={`
                    flex flex-col gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg transition-all duration-200
                    data-[state=active]:bg-background data-[state=active]:shadow-sm
                    data-[state=active]:border data-[state=active]:border-border
                    hover:bg-background/50
                  `}
                >
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <IconComponent className={`h-3 w-3 flex-shrink-0 ${
                      isActive ? 'text-primary' : statusColors[status]
                    }`} />
                    <span className={`text-xs font-medium truncate ${
                      isActive ? 'text-primary' : 'text-foreground'
                    } hidden sm:inline`}>
                      {statusLabels[status]}
                    </span>
                    <span className={`text-xs font-medium ${
                      isActive ? 'text-primary' : 'text-foreground'
                    } sm:hidden`}>
                      {statusLabels[status].slice(0, 3)}
                    </span>
                  </div>
                  
                  <Badge 
                    variant={isActive ? 'default' : 'secondary'} 
                    className={`text-xs px-1 sm:px-1.5 py-0 h-3 sm:h-4 min-w-3 sm:min-w-4 ${
                      isActive 
                        ? 'bg-primary/10 text-primary border-primary/20' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}