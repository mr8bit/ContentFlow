import React, { useState } from 'react';
import { Card, CardContent, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Separator } from '../ui';
import { Filter, X, Calendar, Hash, User, Clock } from 'lucide-react';
import { SourceChannel, TargetChannel } from '../../types';

export interface FilterParams {
  source_channel_id?: number;
  target_channel_id?: number;
  date_from?: string;
  date_to?: string;
  is_manual?: boolean;
}

interface AdvancedPostsFiltersProps {
  sourceChannels: SourceChannel[];
  targetChannels: TargetChannel[];
  filters: FilterParams;
  onFiltersChange: (filters: FilterParams) => void;
  onClearFilters: () => void;
}

export function AdvancedPostsFilters({
  sourceChannels,
  targetChannels,
  filters,
  onFiltersChange,
  onClearFilters,
}: AdvancedPostsFiltersProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof FilterParams, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value,
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== undefined && value !== '').length;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getChannelName = (channels: (SourceChannel | TargetChannel)[], id: number) => {
    const channel = channels.find(c => c.id === id);
    return channel ? channel.channel_name : `ID: ${id}`;
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Дополнительные фильтры</h3>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getActiveFiltersCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Очистить
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? 'Скрыть' : 'Показать'}
            </Button>
          </div>
        </div>

        {/* Active filters display */}
        {getActiveFiltersCount() > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {filters.source_channel_id && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Источник: {getChannelName(sourceChannels, filters.source_channel_id)}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleFilterChange('source_channel_id', undefined)}
                  />
                </Badge>
              )}
              {filters.target_channel_id && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Цель: {getChannelName(targetChannels, filters.target_channel_id)}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleFilterChange('target_channel_id', undefined)}
                  />
                </Badge>
              )}
              {filters.date_from && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  С: {formatDate(filters.date_from)}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleFilterChange('date_from', undefined)}
                  />
                </Badge>
              )}
              {filters.date_to && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  До: {formatDate(filters.date_to)}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleFilterChange('date_to', undefined)}
                  />
                </Badge>
              )}
              {filters.is_manual !== undefined && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {filters.is_manual ? 'Ручные' : 'Автоматические'}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleFilterChange('is_manual', undefined)}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}

        {isExpanded && (
          <>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Source Channel Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  Канал-источник
                </label>
                <Select
                  value={filters.source_channel_id?.toString() || 'all'}
                  onValueChange={(value) => handleFilterChange('source_channel_id', value === 'all' ? undefined : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите канал" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все каналы</SelectItem>
                    {sourceChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id.toString()}>
                        {channel.channel_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Channel Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  Канал назначения
                </label>
                <Select
                  value={filters.target_channel_id?.toString() || 'all'}
                  onValueChange={(value) => handleFilterChange('target_channel_id', value === 'all' ? undefined : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите канал" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все каналы</SelectItem>
                    {targetChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id.toString()}>
                        {channel.channel_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Manual/Auto Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Тип создания
                </label>
                <Select
                  value={filters.is_manual === undefined ? 'all' : filters.is_manual.toString()}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      handleFilterChange('is_manual', undefined);
                    } else {
                      handleFilterChange('is_manual', value === 'true');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все типы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="true">Ручные</SelectItem>
                    <SelectItem value="false">Автоматические</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Дата с
                </label>
                <Input
                  type="date"
                  value={filters.date_from ? filters.date_from.split('T')[0] : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFilterChange('date_from', value ? `${value}T00:00:00.000Z` : undefined);
                  }}
                  className="w-full"
                />
              </div>

              {/* Date To Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Дата до
                </label>
                <Input
                  type="date"
                  value={filters.date_to ? filters.date_to.split('T')[0] : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFilterChange('date_to', value ? `${value}T23:59:59.999Z` : undefined);
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}