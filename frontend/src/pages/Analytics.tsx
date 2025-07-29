import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from 'react-query';
import {
  BarChart3,
  Download,
  RefreshCw,
  Filter,
  Activity,
  Radio,
  Target,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  useToast,
} from '../components/ui';
import { dashboardAPI, sourceChannelsAPI, targetChannelsAPI } from '../services/api';

// Sankey диаграмма компонент
interface SankeyNode {
  id: string;
  name: string;
  type: 'source' | 'target' | 'status';
  value: number;
  color: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Компонент для Sankey диаграммы статусов
const StatusSankeyDiagram: React.FC<{ data: SankeyData }> = ({ data }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 400;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const nodeWidth = 20;

    // Разделяем узлы по типам
    const statusNodes = data.nodes.filter(n => n.type === 'status');
    
    // Позиции для статусов (горизонтальное расположение)
    const statusPositions = [
      { x: margin.left, label: t('analytics.pending') },
      { x: margin.left + (width - margin.left - margin.right) * 0.25, label: t('analytics.processed') },
      { x: margin.left + (width - margin.left - margin.right) * 0.5, label: t('analytics.approved') },
      { x: margin.left + (width - margin.left - margin.right) * 0.5, label: t('analytics.rejected') },
      { x: margin.left + (width - margin.left - margin.right) * 0.75, label: t('analytics.published') }
    ];

    // Устанавливаем позиции узлов
    statusNodes.forEach((node, i) => {
      const position = statusPositions[i] || statusPositions[0];
      (node as any).x = position.x;
      
      // Для "Одобрены" и "Отклонены" размещаем их вертикально
      if (node.name === t('analytics.approved')) {
        (node as any).y = height * 0.3;
      } else if (node.name === t('analytics.rejected')) {
        (node as any).y = height * 0.7;
      } else {
        (node as any).y = height / 2;
      }
      
      (node as any).height = Math.max(30, (node.value / Math.max(...data.nodes.map(n => n.value))) * 80);
    });

    // Создаем группу для диаграммы
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);

    // Рисуем связи
    data.links.forEach(link => {
      const sourceNode = data.nodes.find(n => n.id === link.source) as any;
      const targetNode = data.nodes.find(n => n.id === link.target) as any;
      
      if (!sourceNode || !targetNode) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      const x1 = sourceNode.x + nodeWidth;
      const y1 = sourceNode.y;
      const x2 = targetNode.x;
      const y2 = targetNode.y;
      
      const cp1x = x1 + (x2 - x1) * 0.5;
      const cp2x = x1 + (x2 - x1) * 0.5;
      
      const strokeWidth = Math.max(3, (link.value / Math.max(...data.links.map(l => l.value))) * 25);
      
      path.setAttribute('d', `M ${x1} ${y1} C ${cp1x} ${y1} ${cp2x} ${y2} ${x2} ${y2}`);
      path.setAttribute('stroke', link.color);
      path.setAttribute('stroke-width', strokeWidth.toString());
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', '0.7');
      path.setAttribute('class', 'transition-all duration-300 hover:opacity-100');
      
      g.appendChild(path);

      // Добавляем текст с количеством
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', ((x1 + x2) / 2).toString());
      text.setAttribute('y', ((y1 + y2) / 2 - 8).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'fill-foreground text-xs font-bold');
      text.textContent = link.value.toString();
      g.appendChild(text);
    });

    // Рисуем узлы
    data.nodes.forEach(node => {
      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      // Прямоугольник узла
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (node as any).x.toString());
      rect.setAttribute('y', ((node as any).y - (node as any).height / 2).toString());
      rect.setAttribute('width', nodeWidth.toString());
      rect.setAttribute('height', (node as any).height.toString());
      rect.setAttribute('fill', node.color);
      rect.setAttribute('rx', '6');
      rect.setAttribute('class', 'transition-all duration-300 hover:opacity-80 drop-shadow-lg');
      
      nodeGroup.appendChild(rect);

      // Текст узла
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', ((node as any).x + nodeWidth / 2).toString());
      text.setAttribute('y', ((node as any).y - (node as any).height / 2 - 10).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'fill-foreground text-sm font-bold');
      text.textContent = `${node.name}`;
      
      nodeGroup.appendChild(text);

      // Значение узла
      const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valueText.setAttribute('x', ((node as any).x + nodeWidth / 2).toString());
      valueText.setAttribute('y', ((node as any).y + (node as any).height / 2 + 20).toString());
      valueText.setAttribute('text-anchor', 'middle');
      valueText.setAttribute('class', 'fill-muted-foreground text-xs font-medium');
      valueText.textContent = `(${node.value})`;
      
      nodeGroup.appendChild(valueText);
      g.appendChild(nodeGroup);
    });

  }, [data]);

  return (
    <div className="w-full h-96 border rounded-lg bg-card">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="overflow-visible"
      />
    </div>
  );
};

const SankeyDiagram: React.FC<{ data: SankeyData }> = ({ data }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = svgRef.current;
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 400;

    // Очищаем предыдущий контент
    svg.innerHTML = '';

    // Настройки
    const nodeWidth = 20;
    const nodePadding = 10;
    const margin = { top: 20, right: 40, bottom: 20, left: 40 };

    // Разделяем узлы на источники и цели
    const sourceNodes = data.nodes.filter(n => n.type === 'source');
    const targetNodes = data.nodes.filter(n => n.type === 'target');

    // Позиционирование узлов
    const sourceX = margin.left;
    const targetX = width - margin.right - nodeWidth;
    
    const sourceHeight = height - margin.top - margin.bottom;
    const targetHeight = height - margin.top - margin.bottom;

    // Позиции источников
    sourceNodes.forEach((node, i) => {
      const y = margin.top + (i * (sourceHeight / sourceNodes.length)) + (sourceHeight / sourceNodes.length) / 2;
      (node as any).x = sourceX;
      (node as any).y = y;
      (node as any).height = Math.max(20, (node.value / Math.max(...data.nodes.map(n => n.value))) * 60);
    });

    // Позиции целей
    targetNodes.forEach((node, i) => {
      const y = margin.top + (i * (targetHeight / targetNodes.length)) + (targetHeight / targetNodes.length) / 2;
      (node as any).x = targetX;
      (node as any).y = y;
      (node as any).height = Math.max(20, (node.value / Math.max(...data.nodes.map(n => n.value))) * 60);
    });

    // Создаем группу для диаграммы
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);

    // Рисуем связи
    data.links.forEach(link => {
      const sourceNode = data.nodes.find(n => n.id === link.source) as any;
      const targetNode = data.nodes.find(n => n.id === link.target) as any;
      
      if (!sourceNode || !targetNode) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      const x1 = sourceNode.x + nodeWidth;
      const y1 = sourceNode.y;
      const x2 = targetNode.x;
      const y2 = targetNode.y;
      
      const cp1x = x1 + (x2 - x1) * 0.5;
      const cp2x = x1 + (x2 - x1) * 0.5;
      
      const strokeWidth = Math.max(2, (link.value / Math.max(...data.links.map(l => l.value))) * 20);
      
      path.setAttribute('d', `M ${x1} ${y1} C ${cp1x} ${y1} ${cp2x} ${y2} ${x2} ${y2}`);
      path.setAttribute('stroke', link.color);
      path.setAttribute('stroke-width', strokeWidth.toString());
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', '0.6');
      path.setAttribute('class', 'transition-all duration-300 hover:opacity-100');
      
      g.appendChild(path);

      // Добавляем текст с количеством
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', ((x1 + x2) / 2).toString());
      text.setAttribute('y', ((y1 + y2) / 2 - 5).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'fill-foreground text-xs font-medium');
      text.textContent = link.value.toString();
      g.appendChild(text);
    });

    // Рисуем узлы
    data.nodes.forEach(node => {
      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      // Прямоугольник узла
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (node as any).x.toString());
      rect.setAttribute('y', ((node as any).y - (node as any).height / 2).toString());
      rect.setAttribute('width', nodeWidth.toString());
      rect.setAttribute('height', (node as any).height.toString());
      rect.setAttribute('fill', node.color);
      rect.setAttribute('rx', '4');
      rect.setAttribute('class', 'transition-all duration-300 hover:opacity-80');
      
      nodeGroup.appendChild(rect);

      // Текст узла
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const textX = node.type === 'source' 
        ? (node as any).x + nodeWidth + 8 
        : (node as any).x - 8;
      text.setAttribute('x', textX.toString());
      text.setAttribute('y', ((node as any).y + 4).toString());
      text.setAttribute('text-anchor', node.type === 'source' ? 'start' : 'end');
      text.setAttribute('class', 'fill-foreground text-sm font-medium');
      text.textContent = `${node.name} (${node.value})`;
      
      nodeGroup.appendChild(text);
      g.appendChild(nodeGroup);
    });

  }, [data]);

  return (
    <div className="w-full h-96 border rounded-lg bg-card">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="overflow-visible"
      />
    </div>
  );
};

export default function Analytics() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedTarget, setSelectedTarget] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Получаем данные
  const { data: dashboardStatsResponse, isLoading: statsLoading, error: statsError } = useQuery(
    'dashboard-stats',
    () => dashboardAPI.getStats()
  );

  const dashboardStats = dashboardStatsResponse?.data;

  const { data: sourceChannelsResponse, isLoading: sourceLoading } = useQuery(
    'source-channels',
    () => sourceChannelsAPI.getAll()
  );

  const { data: targetChannelsResponse, isLoading: targetLoading } = useQuery(
    'target-channels',
    () => targetChannelsAPI.getAll()
  );

  const sourceChannels = sourceChannelsResponse?.data;
  const targetChannels = targetChannelsResponse?.data;

  // Генерируем данные для Sankey диаграммы каналов
  const sankeyData: SankeyData = React.useMemo(() => {
    if (!sourceChannels || !targetChannels || !dashboardStats) {
      return { nodes: [], links: [] };
    }

    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    // Цвета для каналов
    const sourceColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
    const targetColors = ['#ef4444', '#f97316', '#84cc16', '#06b6d4', '#8b5cf6'];

    // Добавляем источники
    sourceChannels.forEach((channel, index) => {
      nodes.push({
        id: `source-${channel.id}`,
        name: channel.channel_name || `Канал ${channel.id}`,
        type: 'source',
        value: Math.floor(Math.random() * 50) + 10, // Имитация данных
        color: sourceColors[index % sourceColors.length],
      });
    });

    // Добавляем цели
    targetChannels.forEach((channel, index) => {
      nodes.push({
        id: `target-${channel.id}`,
        name: channel.channel_name || `Канал ${channel.id}`,
        type: 'target',
        value: Math.floor(Math.random() * 40) + 5, // Имитация данных
        color: targetColors[index % targetColors.length],
      });
    });

    // Создаем связи между источниками и целями
    sourceChannels.forEach((sourceChannel, sourceIndex) => {
      targetChannels.forEach((targetChannel, targetIndex) => {
        // Имитируем связи (в реальном приложении это должно быть из API)
        if (Math.random() > 0.3) { // 70% вероятность связи
          const value = Math.floor(Math.random() * 20) + 1;
          links.push({
            source: `source-${sourceChannel.id}`,
            target: `target-${targetChannel.id}`,
            value,
            color: sourceColors[sourceIndex % sourceColors.length],
          });
        }
      });
    });

    return { nodes, links };
  }, [sourceChannels, targetChannels, dashboardStats]);

  // Генерируем данные для Sankey диаграммы статусов
  const statusSankeyData: SankeyData = React.useMemo(() => {
    if (!dashboardStats) {
      return { nodes: [], links: [] };
    }

    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    // Цвета для статусов
    const statusColors = {
      pending: '#f59e0b',      // Ожидают - желтый
      processed: '#3b82f6',    // Обработаны - синий
      approved: '#10b981',     // Одобрены - зеленый
      rejected: '#ef4444',     // Отклонены - красный
      published: '#8b5cf6'     // Опубликованы - фиолетовый
    };

    // Имитируем данные статусов (в реальном приложении это должно быть из API)
    const statusData = {
      pending: 150,
      processed: 120,
      approved: 80,
      rejected: 40,
      published: 75
    };

    // Добавляем узлы статусов
    nodes.push(
      {
        id: 'pending',
        name: t('analytics.pending'),
        type: 'status',
        value: statusData.pending,
        color: statusColors.pending,
      },
      {
        id: 'processed',
        name: t('analytics.processed'),
        type: 'status',
        value: statusData.processed,
        color: statusColors.processed,
      },
      {
        id: 'approved',
        name: t('analytics.approved'),
        type: 'status',
        value: statusData.approved,
        color: statusColors.approved,
      },
      {
        id: 'rejected',
        name: t('analytics.rejected'),
        type: 'status',
        value: statusData.rejected,
        color: statusColors.rejected,
      },
      {
        id: 'published',
        name: t('analytics.published'),
        type: 'status',
        value: statusData.published,
        color: statusColors.published,
      }
    );

    // Создаем связи между статусами
    links.push(
      {
        source: 'pending',
        target: 'processed',
        value: statusData.processed,
        color: statusColors.pending,
      },
      {
        source: 'processed',
        target: 'approved',
        value: statusData.approved,
        color: statusColors.processed,
      },
      {
        source: 'processed',
        target: 'rejected',
        value: statusData.rejected,
        color: statusColors.processed,
      },
      {
        source: 'approved',
        target: 'published',
        value: statusData.published,
        color: statusColors.approved,
      }
    );

    return { nodes, links };
  }, [dashboardStats]);

  const isLoading = statsLoading || sourceLoading || targetLoading;

  // Функция обновления данных
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries(['dashboard-stats', 'source-channels', 'target-channels']);
      toast({
        title: t('analytics.dataRefreshed'),
        description: t('analytics.analyticsUpdated'),
      });
    } catch (error) {
      toast({
        title: t('analytics.refreshError'),
        description: t('analytics.refreshErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Функция экспорта данных
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        timeRange,
        filters: {
          source: selectedSource,
          target: selectedTarget,
        },
        stats: dashboardStats,
        sourceChannels: sourceChannels?.map(ch => ({
          id: ch.id,
          name: ch.channel_name || `${t('analytics.channel')} ${ch.id}`,
        })),
        targetChannels: targetChannels?.map(ch => ({
          id: ch.id,
          name: ch.channel_name || `${t('analytics.channel')} ${ch.id}`,
        })),
        sankeyData,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: t('analytics.exportCompleted'),
        description: t('analytics.analyticsExported'),
      });
    } catch (error) {
      toast({
        title: t('analytics.exportError'),
        description: t('analytics.exportErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Функция применения фильтров
  const handleApplyFilters = () => {
    // В реальном приложении здесь бы был запрос с новыми параметрами
    toast({
      title: t('analytics.filtersApplied'),
      description: `${t('analytics.period')}: ${timeRange}, ${t('analytics.source')}: ${selectedSource}, ${t('analytics.target')}: ${selectedTarget}`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">{t('analytics.loadingError')}</p>
          <Button onClick={() => window.location.reload()}>
            {t('common.refresh')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Аналитика
          </h1>
          <p className="text-muted-foreground">
            Визуализация потоков постов между источниками и целевыми каналами
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={isExporting || isLoading}
          >
            <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
            {isExporting ? 'Экспорт...' : 'Экспорт'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Обновление...' : 'Обновить'}
          </Button>
        </div>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Период</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Последний день</SelectItem>
                  <SelectItem value="7d">Последняя неделя</SelectItem>
                  <SelectItem value="30d">Последний месяц</SelectItem>
                  <SelectItem value="90d">Последние 3 месяца</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Источник</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все источники</SelectItem>
                  {sourceChannels?.map(channel => (
                    <SelectItem key={channel.id} value={channel.id.toString()}>
                      {channel.channel_name || `Канал ${channel.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Цель</label>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все цели</SelectItem>
                  {targetChannels?.map(channel => (
                    <SelectItem key={channel.id} value={channel.id.toString()}>
                      {channel.channel_name || `Канал ${channel.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                className="w-full" 
                onClick={handleApplyFilters}
                disabled={isLoading}
              >
                <Activity className="h-4 w-4 mr-2" />
                Применить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Основная статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('analytics.sources')}</p>
                <p className="text-2xl font-bold">{sourceChannels?.length || 0}</p>
              </div>
              <Radio className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('analytics.targets')}</p>
                <p className="text-2xl font-bold">{targetChannels?.length || 0}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('analytics.totalPosts')}</p>
                <p className="text-2xl font-bold">{dashboardStats?.posts_today || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('analytics.efficiency')}</p>
                <p className="text-2xl font-bold">
                  {dashboardStats ? Math.round((dashboardStats.published_posts / Math.max(dashboardStats.posts_today, 1)) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sankey диаграмма каналов */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            {t('analytics.postFlowTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('analytics.postFlowDescription')}
          </p>
        </CardHeader>
        <CardContent>
          <SankeyDiagram data={sankeyData} />
        </CardContent>
      </Card>

      {/* Sankey диаграмма статусов */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('analytics.statusFlowTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('analytics.statusFlowDescription')}
          </p>
        </CardHeader>
        <CardContent>
          <StatusSankeyDiagram data={statusSankeyData} />
        </CardContent>
      </Card>

      {/* Детальная статистика */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.topSources')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sourceChannels?.slice(0, 5).map((channel, index) => (
                <div key={channel.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-medium">{channel.channel_name || `${t('analytics.channel')} ${channel.id}`}</span>
                  </div>
                  <Badge variant="secondary">
                    {Math.floor(Math.random() * 50) + 10} {t('analytics.posts')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.topTargets')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {targetChannels?.slice(0, 5).map((channel, index) => (
                <div key={channel.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="font-medium">{channel.channel_name || `${t('analytics.channel')} ${channel.id}`}</span>
                  </div>
                  <Badge variant="secondary">
                    {Math.floor(Math.random() * 40) + 5} {t('analytics.posts')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}